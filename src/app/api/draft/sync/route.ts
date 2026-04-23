import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { actualResults, players, draftOrder, triviaRounds } from "@/db/schema";
import { fetchDraftPicks, normalizePlayerName, positionMatches } from "@/lib/espn-api";
import { scoreAllBoards } from "@/lib/scoring";
import { recalculateAllPools } from "@/lib/pool-scoring";
import { getConfig, setConfig, isDraftLocked } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";
import { invalidateCache } from "@/lib/cache";
import { auth } from "@/lib/auth";

const SEASON = 2026;
const RATE_LIMIT_MS = 10_000;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  // This endpoint is driven by the client-side /live polling loop (every 30s
  // across every viewer), which is why we don't require admin. Allow any
  // authenticated user OR a shared-secret header (for cron-style triggers).
  // Blocks anonymous callers from locking the draft or triggering auto-fill.
  const session = await auth();
  const expected = process.env.SYNC_SECRET;
  const provided = req.headers.get("x-sync-secret");
  const hasValidSecret = !!expected && !!provided && safeEqual(provided, expected);
  if (!session?.user?.id && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Rate limit
    const lastSync = await getConfig("last_sync_at");
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync).getTime();
      if (elapsed < RATE_LIMIT_MS) {
        const existing = await db
          .select()
          .from(actualResults)
          .where(eq(actualResults.season, SEASON));
        return NextResponse.json({
          newPicks: 0,
          totalPicks: existing.length,
          cached: true,
        });
      }
    }

    await setConfig("last_sync_at", new Date().toISOString());

    const espnPicks = await fetchDraftPicks(SEASON);
    if (espnPicks.length === 0) {
      const existing = await db
        .select()
        .from(actualResults)
        .where(eq(actualResults.season, SEASON));
      return NextResponse.json({ newPicks: 0, totalPicks: existing.length });
    }

    const ourPlayers = await db.select().from(players);

    const existing = await db
      .select({ pickNumber: actualResults.pickNumber })
      .from(actualResults)
      .where(eq(actualResults.season, SEASON));
    const existingPicks = new Set(existing.map((e) => e.pickNumber));

    const order = await db
      .select({ pickNumber: draftOrder.pickNumber, teamId: draftOrder.teamId })
      .from(draftOrder)
      .where(eq(draftOrder.season, SEASON));
    const teamByPick = new Map(order.map((o) => [o.pickNumber, o.teamId]));

    let newPicks = 0;
    let unmatched = 0;
    for (const pick of espnPicks) {
      if (existingPicks.has(pick.pickNumber)) continue;

      const player = ourPlayers.find(p =>
        normalizePlayerName(p.name) === normalizePlayerName(pick.athleteName) &&
        positionMatches(pick.athletePosition, p.position)
      );

      if (!player) {
        console.warn(`[Sync] No match for: ${pick.athleteName} (${pick.athletePosition})`);
        unmatched++;
        continue;
      }

      const teamId = teamByPick.get(pick.pickNumber);
      if (!teamId) {
        console.warn(`[Sync] No team for pick #${pick.pickNumber}`);
        unmatched++;
        continue;
      }

      await db.insert(actualResults).values({
        season: SEASON,
        pickNumber: pick.pickNumber,
        playerId: player.id,
        teamId,
        espnAthleteId: pick.espnAthleteId,
        announcedAt: new Date(),
      }).onConflictDoNothing();

      newPicks++;
    }

    if (newPicks > 0) {
      console.log(`[Sync] ${new Date().toISOString()} — ${newPicks} new pick(s) detected, total ESPN picks: ${espnPicks.length}`);
      const locked = await isDraftLocked();
      if (!locked) {
        await setConfig("draft_locked", "true");
        await autoFillAllBoards(SEASON);
      }
      await scoreAllBoards(SEASON);
      await recalculateAllPools();
      invalidateCache("leaderboard:");
      invalidateCache("draft-results:");

      // Auto-pause any active trivia rounds so commissioners can resume after the pick is announced
      const paused = await db
        .update(triviaRounds)
        .set({ status: "paused", pausedAt: new Date() })
        .where(eq(triviaRounds.status, "active"))
        .returning({ id: triviaRounds.id });
      if (paused.length > 0) {
        console.log(`[Sync] Auto-paused ${paused.length} active trivia round(s) on new pick`);
      }

      console.log(`[Sync] ${new Date().toISOString()} — Scoring and standings recalculated for all pools`);
    } else {
      console.log(`[Sync] ${new Date().toISOString()} — Poll complete, no new picks (ESPN total: ${espnPicks.length})`);
    }

    const total = await db
      .select()
      .from(actualResults)
      .where(eq(actualResults.season, SEASON));

    // Set sync status: partial if some picks matched but some didn't, otherwise success
    if (newPicks > 0 && unmatched > 0) {
      await setConfig("last_sync_status", "partial");
    } else {
      await setConfig("last_sync_status", "success");
    }

    return NextResponse.json({ newPicks, totalPicks: total.length });
  } catch (err) {
    console.error("[Sync] Error:", err);
    await setConfig("last_sync_status", "failed");
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
