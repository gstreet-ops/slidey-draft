import { db } from "./index";
import { players, picks } from "./schema";
import { eq, inArray, and, sql, isNotNull, isNull } from "drizzle-orm";
import { fetchDraftAthletes, normalizePlayerName, positionMatches, type EspnAthlete } from "@/lib/espn-api";
import { setConfig } from "@/lib/config";

export type RefreshSummary = {
  fetchedAt: Date;
  totalEspnAthletes: number;
  matched: number;
  inserted: number;
  droppedOff: number;
  unmatched: { name: string; position: string; school: string; rank: number }[];
  headshotsFetched: number;
};

/** Minimum athlete count we'll trust — guards against ESPN returning a partial list and nulling everyone's rank. */
const MIN_ATHLETES_FLOOR = 50;
const MAX_RESULTS = 250;

type DbPlayer = {
  id: string;
  name: string;
  position: string;
  rank: number | null;
  grade: number | null;
};

/**
 * Pick the best existing DB row when multiple rows normalize to the same name+position.
 * Prefers: (1) row with existing picks, (2) row with a non-null grade, (3) deterministic by id.
 */
function pickBestMatch(candidates: DbPlayer[], pickedPlayerIds: Set<string>): DbPlayer {
  return candidates.slice().sort((a, b) => {
    const aPicked = pickedPlayerIds.has(a.id) ? 1 : 0;
    const bPicked = pickedPlayerIds.has(b.id) ? 1 : 0;
    if (aPicked !== bPicked) return bPicked - aPicked;
    const aGrade = a.grade ?? -1;
    const bGrade = b.grade ?? -1;
    if (aGrade !== bGrade) return bGrade - aGrade;
    return a.id.localeCompare(b.id);
  })[0];
}

async function fetchMissingHeadshots(playerIds: string[]): Promise<number> {
  if (playerIds.length === 0) return 0;
  const missing = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .where(and(inArray(players.id, playerIds), isNull(players.imageUrl), isNotNull(players.rank)));

  const SEARCH_URL = "https://site.api.espn.com/apis/common/v3/search?type=player&sport=football&limit=5&query=";
  let count = 0;
  for (const p of missing) {
    try {
      const res = await fetch(SEARCH_URL + encodeURIComponent(p.name));
      if (!res.ok) continue;
      const data = await res.json();
      const item = data.items?.[0];
      if (!item) continue;
      const base = item.league === "nfl" ? "nfl" : "college-football";
      const imageUrl = `https://a.espncdn.com/i/headshots/${base}/players/full/${item.id}.png`;
      await db.update(players).set({ imageUrl }).where(eq(players.id, p.id));
      count++;
    } catch {
      // ignore per-player failures; headshot is non-critical
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return count;
}

export async function refreshRanks(season: number = 2026): Promise<RefreshSummary> {
  const athletes = await fetchDraftAthletes(season, MAX_RESULTS);

  if (athletes.length < MIN_ATHLETES_FLOOR) {
    throw new Error(
      `ESPN returned only ${athletes.length} athletes (floor is ${MIN_ATHLETES_FLOOR}). Aborting to avoid wiping ranks.`
    );
  }

  const existing: DbPlayer[] = await db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      rank: players.rank,
      grade: players.grade,
    })
    .from(players);

  const pickRows = await db.select({ playerId: picks.playerId }).from(picks);
  const pickedPlayerIds = new Set(pickRows.map((r) => r.playerId));

  // Index existing rows by normalized name → list of candidates (for same-name disambiguation by position).
  const byNormName = new Map<string, DbPlayer[]>();
  for (const p of existing) {
    const key = normalizePlayerName(p.name);
    if (!byNormName.has(key)) byNormName.set(key, []);
    byNormName.get(key)!.push(p);
  }

  const matchedIds = new Set<string>();
  const insertedIds: string[] = [];
  const unmatched: RefreshSummary["unmatched"] = [];

  let matched = 0;
  let inserted = 0;

  for (const athlete of athletes) {
    const key = normalizePlayerName(athlete.fullName);
    const candidates = (byNormName.get(key) ?? []).filter((c) =>
      positionMatches(athlete.position, c.position)
    );

    if (candidates.length > 0) {
      const best = pickBestMatch(candidates, pickedPlayerIds);
      await db
        .update(players)
        .set({
          rank: athlete.rank,
          position: athlete.position,
          school: athlete.school || "Unknown",
          schoolLogoUrl: athlete.schoolLogoUrl,
        })
        .where(eq(players.id, best.id));
      matchedIds.add(best.id);
      matched++;
    } else {
      const [row] = await db
        .insert(players)
        .values({
          name: athlete.fullName,
          position: athlete.position || "UNK",
          school: athlete.school || "Unknown",
          rank: athlete.rank,
          schoolLogoUrl: athlete.schoolLogoUrl,
        })
        .returning({ id: players.id });
      if (row) {
        insertedIds.push(row.id);
        matchedIds.add(row.id);
      }
      inserted++;
      unmatched.push({
        name: athlete.fullName,
        position: athlete.position,
        school: athlete.school,
        rank: athlete.rank,
      });
    }
  }

  // Null rank for previously-ranked players not in the current ESPN list.
  const toDropIds = existing
    .filter((p) => p.rank !== null && !matchedIds.has(p.id))
    .map((p) => p.id);

  let droppedOff = 0;
  if (toDropIds.length > 0) {
    await db
      .update(players)
      .set({ rank: null })
      .where(inArray(players.id, toDropIds));
    droppedOff = toDropIds.length;
  }

  const headshotsFetched = await fetchMissingHeadshots(insertedIds);

  const fetchedAt = new Date();
  await setConfig("ranks_last_fetched", fetchedAt.toISOString());

  return {
    fetchedAt,
    totalEspnAthletes: athletes.length,
    matched,
    inserted,
    droppedOff,
    unmatched,
    headshotsFetched,
  };
}

// ── CLI entry ────────────────────────────────────────────────
async function cli() {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  REFRESH ESPN RANKS (live fetch)            ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const summary = await refreshRanks(2026);

  console.log(`Fetched at:       ${summary.fetchedAt.toISOString()}`);
  console.log(`ESPN athletes:    ${summary.totalEspnAthletes}`);
  console.log(`Matched existing: ${summary.matched}`);
  console.log(`Inserted new:     ${summary.inserted}`);
  console.log(`Dropped off:      ${summary.droppedOff}`);
  console.log(`Headshots:        ${summary.headshotsFetched}`);

  if (summary.unmatched.length > 0) {
    console.log(`\nUnmatched ESPN athletes (inserted as new, review if name collision suspected):`);
    for (const u of summary.unmatched) {
      console.log(`  #${u.rank.toString().padStart(3)}  ${u.name.padEnd(30)} ${u.position.padEnd(5)} ${u.school}`);
    }
  }

  const total = await db.select({ count: sql<number>`count(*)` }).from(players);
  const ranked = await db.select({ count: sql<number>`count(*)` }).from(players).where(isNotNull(players.rank));
  console.log(`\nFinal DB state: ${ranked[0].count}/${total[0].count} players ranked`);
}

if (require.main === module) {
  cli()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
