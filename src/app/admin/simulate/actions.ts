"use server";

import { db } from "@/db";
import { actualResults, draftOrder, players, scores, draftBoards, picks, pickScores } from "@/db/schema";
import { eq, asc, sql, isNotNull, inArray } from "drizzle-orm";
import { scoreAllBoards } from "@/lib/scoring";
import { scoreLivePredictions, recalculateAllPools } from "@/lib/pool-scoring";
import { revalidatePath } from "next/cache";
import { ACTUAL_DRAFT_ORDER } from "@/db/seed-simulation";

const SEASON = 2026;

function getSimBoardsQuery() {
  return sql`${draftBoards.createdBy} IN (
    SELECT id FROM users WHERE email LIKE 'sim_%@slidey.test'
  )`;
}

export async function getSimulationState() {
  const results = await db
    .select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, SEASON))
    .orderBy(asc(actualResults.pickNumber));

  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));

  const prospects = await db
    .select({ id: players.id, name: players.name, position: players.position, rank: players.rank })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  // Get sim boards
  const simBoards = await db
    .select({ boardId: draftBoards.id, title: draftBoards.title })
    .from(draftBoards)
    .where(getSimBoardsQuery());

  const boardIds = simBoards.map((b) => b.boardId);

  const leaderboard = boardIds.length > 0
    ? await db.select({
        boardId: scores.boardId,
        totalScore: scores.totalScore,
        correctExact: scores.correctExact,
        correctPlayer: scores.correctPlayer,
      }).from(scores)
        .where(inArray(scores.boardId, boardIds))
        .orderBy(sql`${scores.totalScore} DESC`)
    : [];

  const picksAnnounced = results.length;
  const nextPickNumber = picksAnnounced < slots.length ? slots[picksAnnounced].pickNumber : null;
  const nextProspectIdx = picksAnnounced < ACTUAL_DRAFT_ORDER.length ? ACTUAL_DRAFT_ORDER[picksAnnounced] : null;
  const nextProspect = nextProspectIdx !== null && nextProspectIdx < prospects.length ? prospects[nextProspectIdx] : null;

  return {
    picksAnnounced,
    totalPicks: Math.min(slots.length, 32),
    nextPickNumber,
    nextProspect: nextProspect ? { name: nextProspect.name, position: nextProspect.position } : null,
    leaderboard: leaderboard.map((s) => ({
      title: simBoards.find((b) => b.boardId === s.boardId)?.title ?? "?",
      totalScore: s.totalScore,
      correctExact: s.correctExact,
      correctPlayer: s.correctPlayer,
    })),
    announceLog: await getAnnounceLog(),
    error: null as string | null,
  };
}

async function getAnnounceLog() {
  return db
    .select({
      pickNumber: actualResults.pickNumber,
      playerName: players.name,
      playerPosition: players.position,
    })
    .from(actualResults)
    .innerJoin(players, eq(actualResults.playerId, players.id))
    .where(eq(actualResults.season, SEASON))
    .orderBy(asc(actualResults.pickNumber));
}

export async function simulateNextPick(): Promise<{ done: boolean; pickNumber: number; playerName: string; error?: string }> {
  try {
    const slots = await db.select().from(draftOrder)
      .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));
    const prospects = await db.select({ id: players.id, name: players.name })
      .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

    const existing = await db.select({ count: sql<number>`COUNT(*)` })
      .from(actualResults).where(eq(actualResults.season, SEASON));
    const pickIdx = Number(existing[0].count);

    if (pickIdx >= 32 || pickIdx >= ACTUAL_DRAFT_ORDER.length) {
      return { done: true, pickNumber: 0, playerName: "" };
    }

    const slot = slots[pickIdx];
    const prospectIdx = ACTUAL_DRAFT_ORDER[pickIdx];
    const player = prospects[prospectIdx];

    if (!slot || !player) {
      return { done: true, pickNumber: 0, playerName: "", error: `No slot(${pickIdx}) or player(${prospectIdx})` };
    }

    const [result] = await db.insert(actualResults).values({
      season: SEASON,
      pickNumber: slot.pickNumber,
      playerId: player.id,
      teamId: slot.teamId,
      announcedAt: new Date(),
    }).onConflictDoNothing().returning();

    if (!result) {
      return { done: false, pickNumber: slot.pickNumber, playerName: player.name, error: "Pick already exists (conflict)" };
    }

    // Score — wrap each in try/catch so one failure doesn't block everything
    try { await scoreAllBoards(SEASON); } catch (e) { console.error("scoreAllBoards error:", e); }
    try { await scoreLivePredictions(slot.pickNumber, player.id); } catch (e) { console.error("scoreLivePredictions error:", e); }
    try { await recalculateAllPools(); } catch (e) { console.error("recalculateAllPools error:", e); }

    revalidatePath("/admin/simulate");
    revalidatePath("/admin/live");
    revalidatePath("/leaderboard");
    revalidatePath("/live");
    revalidatePath("/pools");

    return { done: false, pickNumber: slot.pickNumber, playerName: player.name };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("simulateNextPick error:", msg);
    return { done: false, pickNumber: 0, playerName: "", error: msg };
  }
}

export async function resetSimulation() {
  await db.delete(actualResults).where(eq(actualResults.season, SEASON));

  const simBoards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(getSimBoardsQuery());
  const boardIds = simBoards.map((b) => b.id);
  if (boardIds.length > 0) {
    await db.delete(pickScores).where(inArray(pickScores.boardId, boardIds));
    await db.delete(scores).where(inArray(scores.boardId, boardIds));
  }

  revalidatePath("/admin/simulate");
  revalidatePath("/leaderboard");
  revalidatePath("/live");
}
