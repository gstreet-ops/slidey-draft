import { db } from "@/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import {
  pools,
  poolMembers,
  poolStandings,
  mockScores,
  liveScores,
  livePredictions,
  draftBoards,
  picks,
  actualResults,
  players,
} from "@/db/schema";
import { getPoolSettings, type PoolSettings } from "@/lib/pool-helpers";

type ActualResult = {
  pickNumber: number;
  playerId: string;
  teamId: string;
};

/**
 * Score a mock draft board using the tiered model for a specific pool.
 * Returns total mock bonus and per-pick breakdown.
 */
export async function scoreMockDraft(
  boardId: string,
  poolId: string
): Promise<{ total: number; breakdown: unknown[] }> {
  const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
  if (!pool) return { total: 0, breakdown: [] };

  const settings = getPoolSettings(pool.settings);
  if (!settings.mockDraftBonus) return { total: 0, breakdown: [] };

  const pv = settings.mockPointValues;

  // Get board picks with player info
  const boardPicks = await db
    .select({
      pickNumber: picks.pickNumber,
      playerId: picks.playerId,
      playerPosition: players.position,
    })
    .from(picks)
    .innerJoin(players, eq(picks.playerId, players.id))
    .where(eq(picks.boardId, boardId))
    .orderBy(asc(picks.pickNumber));

  if (boardPicks.length === 0) return { total: 0, breakdown: [] };

  // Get actual results for rounds covered by pool
  const maxPick = Math.max(...settings.rounds) * 32;
  const results = await db
    .select({
      pickNumber: actualResults.pickNumber,
      playerId: actualResults.playerId,
      teamId: actualResults.teamId,
    })
    .from(actualResults)
    .where(eq(actualResults.season, 2026))
    .orderBy(asc(actualResults.pickNumber));

  const filteredResults = results.filter((r) => r.pickNumber <= maxPick);
  if (filteredResults.length === 0) return { total: 0, breakdown: [] };

  // Get actual player positions
  const actualPlayerPositions = new Map<string, string>();
  for (const r of filteredResults) {
    const [player] = await db
      .select({ position: players.position })
      .from(players)
      .where(eq(players.id, r.playerId));
    if (player) actualPlayerPositions.set(r.playerId, player.position);
  }

  // Map: actual playerId → actual pickNumber
  const actualByPlayer = new Map<string, number>();
  for (const r of filteredResults) {
    actualByPlayer.set(r.playerId, r.pickNumber);
  }

  // Map: actual pickNumber → actual playerId
  const actualBySlot = new Map<number, string>();
  for (const r of filteredResults) {
    actualBySlot.set(r.pickNumber, r.playerId);
  }

  let total = 0;
  const breakdown: {
    pick: number;
    predicted_player_id: string;
    actual_player_id: string | null;
    tier: string;
    points: number;
  }[] = [];

  for (const pick of boardPicks) {
    if (pick.pickNumber > maxPick) continue;

    const actualPlayerId = actualBySlot.get(pick.pickNumber) || null;
    if (!actualPlayerId) continue; // Not yet announced

    let points = 0;
    let tier = "miss";

    const actualPickForPlayer = actualByPlayer.get(pick.playerId);

    if (actualPickForPlayer !== undefined) {
      // Tier 1: Player Called
      points += pv.playerCalled;
      tier = "player_called";

      // Tier 2: Range Accuracy
      const delta = Math.abs(pick.pickNumber - actualPickForPlayer);
      if (delta <= 3) {
        points += pv.rangeClose;
        tier = "range_close";
      } else if (delta <= 7) {
        points += pv.rangeFar;
        tier = "range_far";
      }

      // Tier 3: Exact Slot
      if (delta === 0) {
        points += pv.exactSlot;
        tier = "exact";
      }
    } else {
      // Tier 4: Position Match (only if player NOT called)
      const actualPos = actualPlayerPositions.get(actualPlayerId);
      if (actualPos && actualPos === pick.playerPosition) {
        points += pv.positionMatch;
        tier = "position_match";
      }
    }

    total += points;
    breakdown.push({
      pick: pick.pickNumber,
      predicted_player_id: pick.playerId,
      actual_player_id: actualPlayerId,
      tier,
      points,
    });
  }

  return { total, breakdown };
}

/**
 * Score a live prediction for a specific pick.
 */
export async function scoreLivePredictions(
  pickNumber: number,
  actualPlayerId: string,
  season: number
) {
  // Get all pools with live predictions enabled
  const allPools = await db.select().from(pools);

  for (const pool of allPools) {
    const settings = getPoolSettings(pool.settings);
    if (!settings.livePredictions) continue;

    // Check if this pick number is in a covered round
    const round = Math.ceil(pickNumber / 32);
    if (!settings.rounds.includes(round)) continue;

    const predictions = await db
      .select()
      .from(livePredictions)
      .where(
        and(
          eq(livePredictions.poolId, pool.id),
          eq(livePredictions.pickNumber, pickNumber)
        )
      );

    for (const pred of predictions) {
      const correct = pred.predictedPlayerId === actualPlayerId;
      const pointsAwarded = correct ? settings.livePointValues.correctPlayer : 0;

      // Upsert live score (idempotent)
      const existing = await db
        .select()
        .from(liveScores)
        .where(
          and(
            eq(liveScores.poolId, pool.id),
            eq(liveScores.userId, pred.userId),
            eq(liveScores.pickNumber, pickNumber)
          )
        );

      if (existing.length === 0) {
        await db.insert(liveScores).values({
          poolId: pool.id,
          userId: pred.userId,
          pickNumber,
          pointsAwarded,
          correct,
        });
      }
    }
  }
}

/**
 * Recalculate pool standings for a specific pool.
 */
export async function recalculatePoolStandings(poolId: string) {
  const members = await db
    .select({ userId: poolMembers.userId })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));

  // Preserve previous ranks
  const currentStandings = await db
    .select()
    .from(poolStandings)
    .where(eq(poolStandings.poolId, poolId))
    .orderBy(asc(poolStandings.rank));

  const prevRankMap = new Map<string, number>();
  for (const s of currentStandings) {
    if (s.rank) prevRankMap.set(s.userId, s.rank);
  }

  const standingsData: {
    userId: string;
    mockBonus: number;
    liveTotal: number;
    combinedScore: number;
    picksPredicted: number;
    correctPredictions: number;
  }[] = [];

  for (const member of members) {
    // Get mock bonus
    const mockScoreRows = await db
      .select({ totalMockBonus: mockScores.totalMockBonus })
      .from(mockScores)
      .where(
        and(
          eq(mockScores.poolId, poolId),
          eq(mockScores.userId, member.userId)
        )
      );
    const mockBonus = mockScoreRows.reduce((sum, r) => sum + r.totalMockBonus, 0);

    // Get live totals
    const liveRows = await db
      .select({
        total: sql<number>`COALESCE(SUM(${liveScores.pointsAwarded}), 0)`,
        predicted: sql<number>`COUNT(*)`,
        correct: sql<number>`SUM(CASE WHEN ${liveScores.correct} THEN 1 ELSE 0 END)`,
      })
      .from(liveScores)
      .where(
        and(eq(liveScores.poolId, poolId), eq(liveScores.userId, member.userId))
      );

    const liveTotal = Number(liveRows[0]?.total || 0);
    const picksPredicted = Number(liveRows[0]?.predicted || 0);
    const correctPredictions = Number(liveRows[0]?.correct || 0);

    standingsData.push({
      userId: member.userId,
      mockBonus,
      liveTotal,
      combinedScore: mockBonus + liveTotal,
      picksPredicted,
      correctPredictions,
    });
  }

  // Sort by combined score descending
  standingsData.sort((a, b) => b.combinedScore - a.combinedScore);

  // Upsert standings
  for (let i = 0; i < standingsData.length; i++) {
    const s = standingsData[i];
    const rank = i + 1;
    const previousRank = prevRankMap.get(s.userId) ?? null;

    const existing = await db
      .select({ id: poolStandings.id })
      .from(poolStandings)
      .where(
        and(
          eq(poolStandings.poolId, poolId),
          eq(poolStandings.userId, s.userId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(poolStandings)
        .set({
          mockBonus: s.mockBonus,
          liveTotal: s.liveTotal,
          combinedScore: s.combinedScore,
          rank,
          previousRank,
          picksPredicted: s.picksPredicted,
          correctPredictions: s.correctPredictions,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(poolStandings.poolId, poolId),
            eq(poolStandings.userId, s.userId)
          )
        );
    } else {
      await db.insert(poolStandings).values({
        poolId,
        userId: s.userId,
        mockBonus: s.mockBonus,
        liveTotal: s.liveTotal,
        combinedScore: s.combinedScore,
        rank,
        previousRank,
        picksPredicted: s.picksPredicted,
        correctPredictions: s.correctPredictions,
      });
    }
  }
}

/**
 * Score mock drafts for all members in a pool, then recalculate standings.
 */
export async function scorePoolMockDrafts(poolId: string) {
  const members = await db
    .select({ userId: poolMembers.userId })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));

  for (const member of members) {
    // Find user's published board
    const [board] = await db
      .select({ id: draftBoards.id })
      .from(draftBoards)
      .where(
        and(
          eq(draftBoards.createdBy, member.userId),
          eq(draftBoards.season, 2026)
        )
      )
      .orderBy(desc(draftBoards.publishedAt))
      .limit(1);

    if (!board) continue;

    const { total, breakdown } = await scoreMockDraft(board.id, poolId);

    // Upsert mock score
    const existing = await db
      .select({ id: mockScores.id })
      .from(mockScores)
      .where(
        and(
          eq(mockScores.poolId, poolId),
          eq(mockScores.userId, member.userId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(mockScores)
        .set({
          boardId: board.id,
          totalMockBonus: total,
          perPickBreakdown: breakdown,
          scoredAt: new Date(),
        })
        .where(
          and(
            eq(mockScores.poolId, poolId),
            eq(mockScores.userId, member.userId)
          )
        );
    } else {
      await db.insert(mockScores).values({
        poolId,
        boardId: board.id,
        userId: member.userId,
        totalMockBonus: total,
        perPickBreakdown: breakdown,
      });
    }
  }

  await recalculatePoolStandings(poolId);
}

/**
 * Recalculate all pool standings (called when a new actual result comes in).
 */
export async function recalculateAllPools() {
  const allPools = await db.select({ id: pools.id }).from(pools);
  for (const pool of allPools) {
    await scorePoolMockDrafts(pool.id);
  }
}
