import { db } from "@/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { draftBoards, picks, scores, pickScores, actualResults } from "@/db/schema";

type ActualResult = {
  pickNumber: number;
  playerId: string;
  teamId: string;
};

/**
 * Score a single board against actual results.
 *
 * Scoring rules:
 *   Exact match (correct player at correct pick): 10 pts
 *   Right player, within 5 picks:                  5 pts
 *   Right player, 6+ picks off:                    3 pts
 *   Player not drafted in Round 1:                  0 pts
 *
 * Idempotent — recalculates from scratch each run.
 */
export async function scoreBoard(boardId: string, results: ActualResult[]) {
  if (results.length === 0) return;

  const boardPicks = await db
    .select({
      pickNumber: picks.pickNumber,
      playerId: picks.playerId,
    })
    .from(picks)
    .where(eq(picks.boardId, boardId))
    .orderBy(asc(picks.pickNumber));

  if (boardPicks.length === 0) return;

  // Map: actual playerId → actual pickNumber
  const actualByPlayer = new Map<string, number>();
  for (const r of results) {
    actualByPlayer.set(r.playerId, r.pickNumber);
  }

  const actualPickNumbers = new Set(results.map((r) => r.pickNumber));

  let totalScore = 0;
  let correctExact = 0;
  let correctPlayer = 0;
  const pickScoreRows: {
    boardId: string;
    pickNumber: number;
    pointsAwarded: number;
    matchType: string;
    actualPlayerId: string | null;
  }[] = [];

  for (const pick of boardPicks) {
    if (!actualPickNumbers.has(pick.pickNumber)) continue;

    const actualForSlot = results.find((r) => r.pickNumber === pick.pickNumber);
    const actualPlayerId = actualForSlot?.playerId ?? null;

    const actualPickForPlayer = actualByPlayer.get(pick.playerId);

    let points = 0;
    let matchType = "miss";

    if (actualPickForPlayer !== undefined) {
      const delta = Math.abs(pick.pickNumber - actualPickForPlayer);
      if (delta === 0) {
        points = 10;
        matchType = "exact";
        correctExact++;
      } else if (delta <= 5) {
        points = 5;
        matchType = "close";
        correctPlayer++;
      } else {
        points = 3;
        matchType = "far";
        correctPlayer++;
      }
    }

    totalScore += points;
    pickScoreRows.push({
      boardId,
      pickNumber: pick.pickNumber,
      pointsAwarded: points,
      matchType,
      actualPlayerId,
    });
  }

  // Delete existing pick_scores for this board, then insert
  for (const row of pickScoreRows) {
    await db
      .delete(pickScores)
      .where(and(eq(pickScores.boardId, boardId), eq(pickScores.pickNumber, row.pickNumber)));
  }
  if (pickScoreRows.length > 0) {
    await db.insert(pickScores).values(
      pickScoreRows.map((r) => ({
        boardId: r.boardId,
        pickNumber: r.pickNumber,
        pointsAwarded: r.pointsAwarded,
        matchType: r.matchType,
        actualPlayerId: r.actualPlayerId,
      }))
    );
  }

  const scoredCount = pickScoreRows.length;
  const accuracyPct = scoredCount > 0 ? ((correctExact + correctPlayer) / scoredCount) * 100 : 0;

  const [board] = await db
    .select({ createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));

  const existing = await db
    .select({ id: scores.id })
    .from(scores)
    .where(eq(scores.boardId, boardId));

  if (existing.length > 0) {
    await db
      .update(scores)
      .set({
        totalScore,
        correctExact,
        correctPlayer,
        accuracyPct,
        updatedAt: new Date(),
      })
      .where(eq(scores.boardId, boardId));
  } else {
    await db.insert(scores).values({
      boardId,
      userId: board?.createdBy ?? null,
      totalScore,
      correctExact,
      correctPlayer,
      accuracyPct,
    });
  }
}

/**
 * Score all published/locked boards for a season.
 * Preserves previous_rank for trending arrows before recalculating.
 */
export async function scoreAllBoards(season: number) {
  // 1. Get current rankings to preserve as previous_rank
  const currentScores = await db
    .select({ boardId: scores.boardId, totalScore: scores.totalScore })
    .from(scores)
    .orderBy(desc(scores.totalScore));

  const currentRankMap = new Map<string, number>();
  currentScores.forEach((s, i) => {
    currentRankMap.set(s.boardId, i + 1);
  });

  // 2. Store previous_rank
  for (const [boardId, rank] of currentRankMap) {
    await db
      .update(scores)
      .set({ previousRank: rank })
      .where(eq(scores.boardId, boardId));
  }

  // 3. Get actual results
  const results = await db
    .select({
      pickNumber: actualResults.pickNumber,
      playerId: actualResults.playerId,
      teamId: actualResults.teamId,
    })
    .from(actualResults)
    .where(eq(actualResults.season, season))
    .orderBy(asc(actualResults.pickNumber));

  if (results.length === 0) return;

  // 4. Get all published/locked boards
  const allBoards = await db
    .select({ id: draftBoards.id, status: draftBoards.status })
    .from(draftBoards)
    .where(eq(draftBoards.season, season));

  const eligibleBoards = allBoards.filter(
    (b) => b.status === "published" || b.status === "locked"
  );

  // 5. Score each board
  for (const board of eligibleBoards) {
    await scoreBoard(board.id, results);
  }
}
