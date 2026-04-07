import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { actualResults, players, draftOrder } from "@/db/schema";
import { fetchDraftPicks, normalizePlayerName } from "@/lib/espn-api";
import { scoreAllBoards } from "@/lib/scoring";
import { getConfig, setConfig, isDraftLocked } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";

const SEASON = 2026;
const RATE_LIMIT_MS = 10_000;

export async function GET() {
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
    const playerLookup = new Map<string, typeof ourPlayers[number]>();
    for (const p of ourPlayers) {
      const key = `${normalizePlayerName(p.name)}|${p.position.toLowerCase()}`;
      playerLookup.set(key, p);
    }

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
    for (const pick of espnPicks) {
      if (existingPicks.has(pick.pickNumber)) continue;

      const key = `${normalizePlayerName(pick.athleteName)}|${pick.athletePosition.toLowerCase()}`;
      const player = playerLookup.get(key);

      if (!player) {
        console.warn(`[Sync] No match for: ${pick.athleteName} (${pick.athletePosition})`);
        continue;
      }

      const teamId = teamByPick.get(pick.pickNumber);
      if (!teamId) {
        console.warn(`[Sync] No team for pick #${pick.pickNumber}`);
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
      const locked = await isDraftLocked();
      if (!locked) {
        await setConfig("draft_locked", "true");
        await autoFillAllBoards(SEASON);
      }
      await scoreAllBoards(SEASON);
    }

    const total = await db
      .select()
      .from(actualResults)
      .where(eq(actualResults.season, SEASON));

    return NextResponse.json({ newPicks, totalPicks: total.length });
  } catch (err) {
    console.error("[Sync] Error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
