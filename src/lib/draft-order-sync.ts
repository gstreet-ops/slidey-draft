"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { draftOrder, teams, trades } from "@/db/schema";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const ESPN_ROUNDS_URL =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/draft/rounds";
const ESPN_SITE_TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=50";

export type ESPNPick = {
  pickNumber: number;
  teamAbbreviation: string;
  traded: boolean;
  tradeNote: string | null;
};

export type SyncSummary = {
  ok: true;
  tradesDetected: number;
  updatedPicks: number[];
  ranAt: string;
  lastTradeDetectedAt: string | null;
} | {
  ok: false;
  error: string;
  ranAt: string;
};

/** Pulls the site-API teams list once and returns a map of ESPN team id →
 *  abbreviation. Uses the site endpoint (not the core $ref graph) because it
 *  returns full team data in a single response instead of 32 follow-up
 *  fetches. */
async function fetchEspnTeamAbbrMap(signal?: AbortSignal): Promise<Map<string, string>> {
  const res = await fetch(ESPN_SITE_TEAMS_URL, {
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ESPN teams: ${res.status}`);
  const data: unknown = await res.json();

  const teamsList = (data as {
    sports?: Array<{ leagues?: Array<{ teams?: Array<{ team?: { id?: string; abbreviation?: string } }> }> }>;
  })?.sports?.[0]?.leagues?.[0]?.teams;

  if (!Array.isArray(teamsList)) {
    throw new Error("ESPN teams: unexpected response shape");
  }

  const map = new Map<string, string>();
  for (const t of teamsList) {
    const id = t?.team?.id;
    const abbr = t?.team?.abbreviation;
    if (id && abbr) map.set(String(id), abbr.toUpperCase());
  }
  if (map.size < 32) {
    throw new Error(`ESPN teams: only ${map.size}/32 mapped`);
  }
  return map;
}

/** Fetches Round 1 from the core draft API and resolves each pick's team
 *  abbreviation via the prefetched team map. Returns picks sorted by pick
 *  number. Throws on network/shape errors — callers should catch + log. */
export async function fetchESPNDraftOrder(): Promise<ESPNPick[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const teamMap = await fetchEspnTeamAbbrMap(controller.signal);

    const res = await fetch(ESPN_ROUNDS_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ESPN rounds: ${res.status}`);
    const data: unknown = await res.json();

    const rounds = (data as { items?: Array<{ number?: number; picks?: unknown[] }> })?.items;
    if (!Array.isArray(rounds)) throw new Error("ESPN rounds: items not an array");

    const round1 = rounds.find((r) => r?.number === 1);
    if (!round1 || !Array.isArray(round1.picks)) {
      throw new Error("ESPN rounds: Round 1 not found");
    }

    const picks: ESPNPick[] = [];
    for (const raw of round1.picks) {
      const p = raw as {
        pick?: number;
        traded?: boolean;
        tradeNote?: string;
        team?: { $ref?: string };
      };
      const pickNumber = p?.pick;
      const ref = p?.team?.$ref;
      if (typeof pickNumber !== "number" || !ref) continue;

      const idMatch = /\/teams\/(\d+)/.exec(ref);
      const espnTeamId = idMatch?.[1];
      if (!espnTeamId) continue;

      const abbr = teamMap.get(espnTeamId);
      if (!abbr) continue;

      picks.push({
        pickNumber,
        teamAbbreviation: abbr,
        traded: p?.traded === true,
        tradeNote: p?.tradeNote ? p.tradeNote : null,
      });
    }

    if (picks.length < 32) {
      throw new Error(`ESPN rounds: parsed ${picks.length}/32 picks`);
    }
    picks.sort((a, b) => a.pickNumber - b.pickNumber);
    return picks;
  } finally {
    clearTimeout(timeout);
  }
}

/** Compares ESPN's Round 1 ownership against our draft_order table and
 *  records a trade row + updates the slot for every ownership change. Idempotent
 *  across re-runs — a slot already at the ESPN team is a no-op. The first
 *  discovered change for a slot preserves that slot's originalTeamId. */
export async function syncDraftOrder(season: number = 2026): Promise<SyncSummary> {
  const ranAt = new Date();
  let espnPicks: ESPNPick[];
  try {
    espnPicks = await fetchESPNDraftOrder();
  } catch (e) {
    return { ok: false, error: (e as Error).message, ranAt: ranAt.toISOString() };
  }

  // Build abbreviation → internal teamId map using our `teams` table so we can
  // reconcile ESPN's abbreviations with our UUIDs.
  const internalTeams = await db
    .select({ id: teams.id, abbreviation: teams.abbreviation })
    .from(teams);
  const abbrToId = new Map(internalTeams.map((t) => [t.abbreviation.toUpperCase(), t.id]));

  const currentSlots = await db
    .select({
      id: draftOrder.id,
      pickNumber: draftOrder.pickNumber,
      teamId: draftOrder.teamId,
      originalTeamId: draftOrder.originalTeamId,
    })
    .from(draftOrder)
    .where(eq(draftOrder.season, season));
  const slotByPick = new Map(currentSlots.map((s) => [s.pickNumber, s]));

  const updatedPicks: number[] = [];

  for (const espn of espnPicks) {
    const slot = slotByPick.get(espn.pickNumber);
    if (!slot) continue;

    const newTeamId = abbrToId.get(espn.teamAbbreviation);
    if (!newTeamId) continue; // unknown abbr on our side — skip, don't crash

    if (slot.teamId === newTeamId) continue; // no change

    const previousTeamId = slot.teamId;
    const tradeNote =
      espn.tradeNote?.trim() ||
      `Detected via ESPN: slot changed to ${espn.teamAbbreviation}`;

    await db
      .update(draftOrder)
      .set({
        teamId: newTeamId,
        originalTeamId: slot.originalTeamId ?? previousTeamId,
        tradeNote,
        updatedAt: ranAt,
      })
      .where(eq(draftOrder.id, slot.id));

    await db.insert(trades).values({
      season,
      pickNumber: espn.pickNumber,
      previousTeamId,
      newTeamId,
      tradeNote,
      source: "espn_sync",
      detectedAt: ranAt,
    });

    updatedPicks.push(espn.pickNumber);
  }

  if (updatedPicks.length > 0) {
    // Guarded — safe to call this function from a cron/script that isn't in a
    // Next.js request context. `revalidatePath` throws when there's no static
    // generation store; swallow it so the sync still completes.
    try {
      revalidatePath("/trades");
      revalidatePath("/mock-drafts");
      revalidatePath("/admin");
    } catch {
      // Non-request context — caller handles freshness separately.
    }
  }

  return {
    ok: true,
    tradesDetected: updatedPicks.length,
    updatedPicks,
    ranAt: ranAt.toISOString(),
    lastTradeDetectedAt: await getLastEspnSyncAt(season),
  };
}

/** Returns the most recent ESPN-sync `detected_at` for a season, as an ISO
 *  string — used to display "last sync" in admin UI. Null if never synced. */
export async function getLastEspnSyncAt(season: number): Promise<string | null> {
  const [row] = await db
    .select({ detectedAt: trades.detectedAt })
    .from(trades)
    .where(and(eq(trades.season, season), eq(trades.source, "espn_sync")))
    .orderBy(desc(trades.detectedAt))
    .limit(1);
  return row ? (row.detectedAt as Date).toISOString() : null;
}

/** Admin-gated wrapper used by the admin panel button. */
export async function forceSyncDraftOrder(season: number = 2026): Promise<SyncSummary> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }
  return syncDraftOrder(season);
}
