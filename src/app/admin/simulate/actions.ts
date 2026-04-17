"use server";

import { db } from "@/db";
import {
  actualResults, draftOrder, players, scores, draftBoards,
  picks, pickScores, pools, poolMembers, livePredictions, liveScores,
  poolStandings, mockScores, poolTriviaQueue,
} from "@/db/schema";
import { getPoolSettings } from "@/lib/pool-helpers";
import { eq, asc, and, sql, isNotNull, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ACTUAL_DRAFT_ORDER } from "@/db/simulation-config";

const SEASON = 2026;

function simBoardsWhere() {
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

  const simBoards = await db
    .select({ boardId: draftBoards.id, title: draftBoards.title })
    .from(draftBoards)
    .where(simBoardsWhere());

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

/**
 * Lightweight board scoring — only scores sim boards, inline.
 * Avoids the full scoreAllBoards cascade that times out on Vercel.
 */
async function scoreSimBoards() {
  const results = await db
    .select({ pickNumber: actualResults.pickNumber, playerId: actualResults.playerId })
    .from(actualResults)
    .where(eq(actualResults.season, SEASON))
    .orderBy(asc(actualResults.pickNumber));

  if (results.length === 0) return;

  const actualByPlayer = new Map<string, number>();
  for (const r of results) actualByPlayer.set(r.playerId, r.pickNumber);
  const actualPickNumbers = new Set(results.map((r) => r.pickNumber));

  const simBoards = await db
    .select({ id: draftBoards.id, createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(simBoardsWhere());

  for (const board of simBoards) {
    const boardPicks = await db
      .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
      .from(picks)
      .where(eq(picks.boardId, board.id))
      .orderBy(asc(picks.pickNumber));

    let totalScore = 0, correctExact = 0, correctPlayer = 0;
    const psRows: { boardId: string; pickNumber: number; pointsAwarded: number; matchType: string; actualPlayerId: string | null }[] = [];

    for (const pick of boardPicks) {
      if (!actualPickNumbers.has(pick.pickNumber)) continue;
      const actualForSlot = results.find((r) => r.pickNumber === pick.pickNumber);
      const actualPickForPlayer = actualByPlayer.get(pick.playerId);

      let points = 0, matchType = "miss";
      if (actualPickForPlayer !== undefined) {
        const delta = Math.abs(pick.pickNumber - actualPickForPlayer);
        if (delta === 0) { points = 10; matchType = "exact"; correctExact++; }
        else if (delta <= 5) { points = 5; matchType = "close"; correctPlayer++; }
        else { points = 3; matchType = "far"; correctPlayer++; }
      }
      totalScore += points;
      psRows.push({ boardId: board.id, pickNumber: pick.pickNumber, pointsAwarded: points, matchType, actualPlayerId: actualForSlot?.playerId ?? null });
    }

    // Upsert pick scores
    if (psRows.length > 0) {
      await db.delete(pickScores).where(and(
        eq(pickScores.boardId, board.id),
        inArray(pickScores.pickNumber, psRows.map((r) => r.pickNumber))
      ));
      await db.insert(pickScores).values(psRows);
    }

    // Upsert board score
    const scoredCount = psRows.length;
    const accuracyPct = scoredCount > 0 ? ((correctExact + correctPlayer) / scoredCount) * 100 : 0;

    const [existing] = await db.select({ id: scores.id }).from(scores).where(eq(scores.boardId, board.id));
    if (existing) {
      await db.update(scores).set({ totalScore, correctExact, correctPlayer, accuracyPct, updatedAt: new Date() })
        .where(eq(scores.boardId, board.id));
    } else {
      await db.insert(scores).values({ boardId: board.id, userId: board.createdBy, totalScore, correctExact, correctPlayer, accuracyPct });
    }
  }
}

/**
 * Lightweight live prediction scoring — only scores the sim pool.
 */
async function scoreSimLivePrediction(pickNumber: number, actualPlayerId: string) {
  const simPools = await db.select({ id: pools.id }).from(pools)
    .where(sql`${pools.name} = 'Draft Day Showdown (Sim)'`);

  for (const pool of simPools) {
    const preds = await db.select().from(livePredictions)
      .where(and(eq(livePredictions.poolId, pool.id), eq(livePredictions.pickNumber, pickNumber)));

    for (const pred of preds) {
      const correct = pred.predictedPlayerId === actualPlayerId;
      const pointsAwarded = correct ? 10 : 0;

      const [existing] = await db.select({ id: liveScores.id }).from(liveScores)
        .where(and(eq(liveScores.poolId, pool.id), eq(liveScores.userId, pred.userId), eq(liveScores.pickNumber, pickNumber)));

      if (!existing) {
        await db.insert(liveScores).values({ poolId: pool.id, userId: pred.userId, pickNumber, pointsAwarded, correct });
      }
    }

    // Recalculate this pool's standings
    const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, pool.id));

    const standingsData: { userId: string; mockBonus: number; liveTotal: number; combinedScore: number; picksPredicted: number; correctPredictions: number }[] = [];

    for (const member of members) {
      const [live] = await db.select({
        total: sql<number>`COALESCE(SUM(${liveScores.pointsAwarded}), 0)`,
        predicted: sql<number>`COUNT(*)`,
        correct: sql<number>`COALESCE(SUM(CASE WHEN ${liveScores.correct} THEN 1 ELSE 0 END), 0)`,
      }).from(liveScores).where(and(eq(liveScores.poolId, pool.id), eq(liveScores.userId, member.userId)));

      const mockBonus = 0; // Skip mock scoring for speed
      const liveTotal = Number(live.total);
      standingsData.push({
        userId: member.userId,
        mockBonus,
        liveTotal,
        combinedScore: mockBonus + liveTotal,
        picksPredicted: Number(live.predicted),
        correctPredictions: Number(live.correct),
      });
    }

    standingsData.sort((a, b) => b.combinedScore - a.combinedScore);

    for (let i = 0; i < standingsData.length; i++) {
      const s = standingsData[i];
      const [existing] = await db.select({ id: poolStandings.id, rank: poolStandings.rank }).from(poolStandings)
        .where(and(eq(poolStandings.poolId, pool.id), eq(poolStandings.userId, s.userId)));

      if (existing) {
        await db.update(poolStandings).set({
          ...s, rank: i + 1, previousRank: existing.rank, updatedAt: new Date(),
        }).where(eq(poolStandings.id, existing.id));
      } else {
        await db.insert(poolStandings).values({ poolId: pool.id, ...s, rank: i + 1 });
      }
    }
  }
}

export async function simulateNextPick(): Promise<{ done: boolean; pickNumber: number; playerName: string; error?: string }> {
  try {
    const slots = await db.select().from(draftOrder)
      .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));
    const prospects = await db.select({ id: players.id, name: players.name })
      .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

    const [existing] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(actualResults).where(eq(actualResults.season, SEASON));
    const pickIdx = Number(existing.count);

    if (pickIdx >= 32 || pickIdx >= ACTUAL_DRAFT_ORDER.length) {
      return { done: true, pickNumber: 0, playerName: "" };
    }

    const slot = slots[pickIdx];
    const prospectIdx = ACTUAL_DRAFT_ORDER[pickIdx];
    const player = prospects[prospectIdx];

    if (!slot || !player) {
      return { done: true, pickNumber: 0, playerName: "", error: `Missing slot or player at index ${pickIdx}` };
    }

    // Insert actual result
    const [result] = await db.insert(actualResults).values({
      season: SEASON,
      pickNumber: slot.pickNumber,
      playerId: player.id,
      teamId: slot.teamId,
      announcedAt: new Date(),
    }).onConflictDoNothing().returning();

    if (!result) {
      return { done: false, pickNumber: slot.pickNumber, playerName: player.name, error: "Pick already exists" };
    }

    // Lightweight scoring — sim boards + sim pool only
    await scoreSimBoards();
    await scoreSimLivePrediction(slot.pickNumber, player.id);
    await advanceTriviaQueues(slot.pickNumber);

    revalidatePath("/admin/simulate");
    revalidatePath("/live");

    return { done: false, pickNumber: slot.pickNumber, playerName: player.name };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("simulateNextPick error:", msg);
    return { done: false, pickNumber: 0, playerName: "", error: msg };
  }
}

/**
 * Advance trivia queues for all pools — complete active question, fire next pending.
 */
async function advanceTriviaQueues(pickNumber: number) {
  const allPools = await db.select({ id: pools.id, settings: pools.settings }).from(pools);
  for (const pool of allPools) {
    const settings = getPoolSettings(pool.settings);
    if (settings.trivia) {
      await db
        .update(poolTriviaQueue)
        .set({ status: "completed", completedAt: new Date() })
        .where(and(eq(poolTriviaQueue.poolId, pool.id), eq(poolTriviaQueue.status, "active")));

      const [next] = await db
        .select({ id: poolTriviaQueue.id })
        .from(poolTriviaQueue)
        .where(and(eq(poolTriviaQueue.poolId, pool.id), eq(poolTriviaQueue.status, "pending")))
        .orderBy(asc(poolTriviaQueue.sortOrder))
        .limit(1);

      if (next) {
        await db
          .update(poolTriviaQueue)
          .set({ status: "active", activatedAt: new Date(), pickNumber })
          .where(eq(poolTriviaQueue.id, next.id));
      }
    }
  }
}

/**
 * Get trivia status across all pools for the simulate dashboard.
 */
export async function getTriviaStatus() {
  const allPools = await db.select({ id: pools.id, name: pools.name }).from(pools);
  const statuses = [];

  for (const pool of allPools) {
    const [active] = await db
      .select({ question: sql<string>`q.question`, sortOrder: poolTriviaQueue.sortOrder })
      .from(poolTriviaQueue)
      .innerJoin(sql`trivia_questions q`, sql`q.id = ${poolTriviaQueue.questionId}`)
      .where(and(eq(poolTriviaQueue.poolId, pool.id), eq(poolTriviaQueue.status, "active")))
      .limit(1);

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${poolTriviaQueue.status} = 'pending')`,
        completed: sql<number>`count(*) filter (where ${poolTriviaQueue.status} = 'completed')`,
      })
      .from(poolTriviaQueue)
      .where(eq(poolTriviaQueue.poolId, pool.id));

    if (Number(counts.total) > 0) {
      statuses.push({
        poolId: pool.id,
        poolName: pool.name,
        activeQuestion: active?.question ?? null,
        activeSortOrder: active?.sortOrder ?? null,
        pending: Number(counts.pending),
        completed: Number(counts.completed),
        total: Number(counts.total),
      });
    }
  }

  return statuses;
}

export async function resetSimulation() {
  // Clear actual results
  await db.delete(actualResults).where(eq(actualResults.season, SEASON));

  // Clear sim board scores
  const simBoards = await db.select({ id: draftBoards.id }).from(draftBoards).where(simBoardsWhere());
  const boardIds = simBoards.map((b) => b.id);
  if (boardIds.length > 0) {
    await db.delete(pickScores).where(inArray(pickScores.boardId, boardIds));
    await db.delete(scores).where(inArray(scores.boardId, boardIds));
  }

  // Clear sim pool scores
  const simPools = await db.select({ id: pools.id }).from(pools)
    .where(sql`${pools.name} = 'Draft Day Showdown (Sim)'`);
  const poolIds = simPools.map((p) => p.id);
  if (poolIds.length > 0) {
    await db.delete(liveScores).where(inArray(liveScores.poolId, poolIds));
    await db.delete(poolStandings).where(inArray(poolStandings.poolId, poolIds));
  }

  // Reset trivia queues — set active/completed back to pending
  const allPools = await db.select({ id: pools.id }).from(pools);
  for (const pool of allPools) {
    await db
      .update(poolTriviaQueue)
      .set({ status: "pending", activatedAt: null, completedAt: null, pickNumber: null })
      .where(and(eq(poolTriviaQueue.poolId, pool.id), sql`${poolTriviaQueue.status} != 'pending'`));
  }

  revalidatePath("/admin/simulate");
  revalidatePath("/live");
}
