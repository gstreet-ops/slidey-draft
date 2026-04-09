"use server";

import { db } from "@/db";
import { actualResults, draftOrder, players, scores, draftBoards, picks, pickScores } from "@/db/schema";
import { eq, asc, sql, isNotNull, inArray } from "drizzle-orm";
import { scoreAllBoards } from "@/lib/scoring";
import { scoreLivePredictions, recalculateAllPools } from "@/lib/pool-scoring";
import { revalidatePath } from "next/cache";
import { ACTUAL_DRAFT_ORDER } from "@/db/seed-simulation";

const SEASON = 2026;

export async function getSimulationState() {
  const results = await db.select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, SEASON))
    .orderBy(asc(actualResults.pickNumber));

  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));

  const prospects = await db.select({ id: players.id, name: players.name, position: players.position, rank: players.rank })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  // Get sim users' boards
  const simBoards = await db
    .select({
      boardId: draftBoards.id,
      title: draftBoards.title,
      userId: draftBoards.createdBy,
    })
    .from(draftBoards)
    .where(sql`${draftBoards.title} LIKE '%Mock Draft' AND ${draftBoards.createdBy} IN (
      SELECT id FROM users WHERE email LIKE 'sim_%@slidey.test'
    )`);

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
  const nextProspect = nextProspectIdx !== null ? prospects[nextProspectIdx] : null;
  const nextTeam = nextPickNumber !== null ? slots.find((s) => s.pickNumber === nextPickNumber) : null;

  return {
    picksAnnounced,
    totalPicks: Math.min(slots.length, 32),
    nextPickNumber,
    nextProspect: nextProspect ? { name: nextProspect.name, position: nextProspect.position } : null,
    nextTeamId: nextTeam?.teamId ?? null,
    leaderboard: leaderboard.map((s) => ({
      title: simBoards.find((b) => b.boardId === s.boardId)?.title ?? "?",
      totalScore: s.totalScore,
      correctExact: s.correctExact,
      correctPlayer: s.correctPlayer,
    })),
    announceLog: await getAnnounceLog(),
  };
}

async function getAnnounceLog() {
  const results = await db
    .select({
      pickNumber: actualResults.pickNumber,
      playerName: players.name,
      playerPosition: players.position,
    })
    .from(actualResults)
    .innerJoin(players, eq(actualResults.playerId, players.id))
    .where(eq(actualResults.season, SEASON))
    .orderBy(asc(actualResults.pickNumber));

  return results;
}

export async function simulateNextPick() {
  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));
  const prospects = await db.select({ id: players.id, name: players.name })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  const existing = await db.select({ count: sql<number>`COUNT(*)` })
    .from(actualResults).where(eq(actualResults.season, SEASON));
  const pickIdx = existing[0].count;

  if (pickIdx >= 32 || pickIdx >= ACTUAL_DRAFT_ORDER.length) {
    return { done: true, pickNumber: 0, playerName: "" };
  }

  const slot = slots[pickIdx];
  const prospectIdx = ACTUAL_DRAFT_ORDER[pickIdx];
  const player = prospects[prospectIdx];

  await db.insert(actualResults).values({
    season: SEASON,
    pickNumber: slot.pickNumber,
    playerId: player.id,
    teamId: slot.teamId,
    announcedAt: new Date(),
  }).onConflictDoNothing();

  await scoreAllBoards(SEASON);
  await scoreLivePredictions(slot.pickNumber, player.id);
  await recalculateAllPools();

  revalidatePath("/admin/simulate");
  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  revalidatePath("/live");
  revalidatePath("/pools");

  return { done: false, pickNumber: slot.pickNumber, playerName: player.name };
}

export async function resetSimulation() {
  await db.delete(actualResults).where(eq(actualResults.season, SEASON));

  // Clear scores for sim boards
  const simBoards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(sql`${draftBoards.title} LIKE '%Mock Draft' AND ${draftBoards.createdBy} IN (
      SELECT id FROM users WHERE email LIKE 'sim_%@slidey.test'
    )`);
  const boardIds = simBoards.map((b) => b.id);
  if (boardIds.length > 0) {
    await db.delete(pickScores).where(inArray(pickScores.boardId, boardIds));
    await db.delete(scores).where(inArray(scores.boardId, boardIds));
  }

  revalidatePath("/admin/simulate");
  revalidatePath("/leaderboard");
  revalidatePath("/live");
}
