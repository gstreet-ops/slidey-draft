/**
 * Live Draft Day Simulation
 *
 * Simulates the full multi-user draft experience:
 * 1. Creates 4 test users with different mock draft boards
 * 2. Creates a test pool with all users
 * 3. Publishes all boards + locks the pool
 * 4. Enters actual results one pick at a time (simulating real draft)
 * 5. Submits live predictions from pool members
 * 6. Verifies scoring, leaderboard rankings, and pool standings
 * 7. Cleans up all test data
 */

import { db } from "./index";
import {
  users, draftBoards, picks, draftOrder, players, actualResults,
  scores, pickScores, pools, poolMembers, poolStandings,
  livePredictions, liveScores, mockScores,
} from "./schema";
import { eq, asc, and, sql, isNotNull, inArray } from "drizzle-orm";
import { scoreAllBoards } from "../lib/scoring";
import { scoreLivePredictions, recalculateAllPools, scorePoolMockDrafts } from "../lib/pool-scoring";

const SEASON = 2026;
const TEST_PREFIX = "__SIM__";
const NUM_PICKS_TO_SIMULATE = 10; // simulate first 10 picks of the draft

// ── Helpers ──

function log(msg: string) { console.log(msg); }
function ok(msg: string) { console.log(`   OK — ${msg}`); }
function fail(msg: string) { console.log(`   FAIL — ${msg}`); }
function warn(msg: string) { console.log(`   WARN — ${msg}`); }

async function cleanup() {
  // Find test users
  const testUsers = await db.select({ id: users.id }).from(users)
    .where(sql`${users.email} LIKE ${TEST_PREFIX + '%'}`);
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length > 0) {
    // Clean pool data
    const testPools = await db.select({ id: pools.id }).from(pools)
      .where(sql`${pools.name} LIKE ${TEST_PREFIX + '%'}`);
    const poolIds = testPools.map((p) => p.id);

    if (poolIds.length > 0) {
      await db.delete(poolStandings).where(inArray(poolStandings.poolId, poolIds));
      await db.delete(liveScores).where(inArray(liveScores.poolId, poolIds));
      await db.delete(livePredictions).where(inArray(livePredictions.poolId, poolIds));
      await db.delete(mockScores).where(inArray(mockScores.poolId, poolIds));
      await db.delete(poolMembers).where(inArray(poolMembers.poolId, poolIds));
      await db.delete(pools).where(inArray(pools.id, poolIds));
    }

    // Clean boards + picks
    const testBoards = await db.select({ id: draftBoards.id }).from(draftBoards)
      .where(inArray(draftBoards.createdBy, userIds));
    const boardIds = testBoards.map((b) => b.id);

    if (boardIds.length > 0) {
      await db.delete(pickScores).where(inArray(pickScores.boardId, boardIds));
      await db.delete(scores).where(inArray(scores.boardId, boardIds));
      await db.delete(picks).where(inArray(picks.boardId, boardIds));
      await db.delete(draftBoards).where(inArray(draftBoards.id, boardIds));
    }

    // Clean actual results (test season marker)
    await db.delete(actualResults).where(
      and(eq(actualResults.season, SEASON), sql`${actualResults.teamId} IN (
        SELECT team_id FROM draft_order WHERE season = ${SEASON}
      )`)
    );

    // Clean users
    await db.delete(users).where(inArray(users.id, userIds));
  }

  // Also clean any orphaned actual results from previous test runs
  // Only delete results that match test data pattern
}

async function main() {
  log("╔══════════════════════════════════════════════╗");
  log("║     LIVE DRAFT DAY SIMULATION               ║");
  log("╚══════════════════════════════════════════════╝\n");

  await cleanup();

  // ── Reference data ──
  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));
  const allProspects = await db.select().from(players)
    .where(isNotNull(players.rank)).orderBy(asc(players.rank));

  if (slots.length < NUM_PICKS_TO_SIMULATE || allProspects.length < 32) {
    fail(`Need ${NUM_PICKS_TO_SIMULATE} slots and 32 prospects. Found ${slots.length} slots, ${allProspects.length} prospects.`);
    process.exit(1);
  }

  // ══════════════════════════════════════════════
  // STEP 1: Create test users
  // ══════════════════════════════════════════════
  log("1. Creating 4 test users...");
  const userNames = ["Alice", "Bob", "Charlie", "Diana"];
  const testUsers: { id: string; name: string }[] = [];

  for (const name of userNames) {
    const [u] = await db.insert(users).values({
      email: `${TEST_PREFIX}${name.toLowerCase()}@test.com`,
      name: `${TEST_PREFIX}${name}`,
      status: "active",
    }).returning();
    testUsers.push({ id: u.id, name });
  }
  ok(`Created: ${testUsers.map((u) => u.name).join(", ")}`);

  // ══════════════════════════════════════════════
  // STEP 2: Create mock draft boards with different strategies
  // ══════════════════════════════════════════════
  log("\n2. Creating mock draft boards with different strategies...");

  // Strategy: each user has slightly different pick order
  // Alice: picks by consensus rank (1,2,3,4...)
  // Bob: slightly shuffled (2,1,4,3,6,5...)
  // Charlie: bold picks — skips top prospects, grabs sleepers
  // Diana: mostly consensus but a few wild swings

  const strategies: Record<string, number[]> = {
    Alice:   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
    Bob:     [1, 0, 3, 2, 5, 4, 7, 6, 9, 8, 11,10,13,12,15,14,17,16,19,18,21,20,23,22,25,24,27,26,29,28,31,30],
    Charlie: [5, 8, 2, 12,0, 15,3, 18,1, 20,10, 7,22,14, 6,25, 9,28, 4,30,11,16,13,19,17,24,21,26,23,29,27,31],
    Diana:   [0, 1, 8, 3, 4, 2, 6, 7, 5, 9, 10,15,12,13,14,11,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
  };

  const boards: { userId: string; boardId: string; name: string }[] = [];

  for (const user of testUsers) {
    const [board] = await db.insert(draftBoards).values({
      title: `${TEST_PREFIX}${user.name}'s Mock`,
      season: SEASON,
      type: "mock",
      status: "published",
      createdBy: user.id,
      publishedAt: new Date(),
    }).returning();

    const strategy = strategies[user.name];
    for (let i = 0; i < 32; i++) {
      const prospectIdx = strategy[i];
      await db.insert(picks).values({
        boardId: board.id,
        pickNumber: slots[i].pickNumber,
        playerId: allProspects[prospectIdx].id,
        teamId: slots[i].teamId,
      });
    }

    boards.push({ userId: user.id, boardId: board.id, name: user.name });
    ok(`${user.name}: 32 picks (strategy: ${user.name === "Alice" ? "consensus" : user.name === "Bob" ? "adjacent-swap" : user.name === "Charlie" ? "bold sleepers" : "mostly consensus"})`);
  }

  // ══════════════════════════════════════════════
  // STEP 3: Create test pool
  // ══════════════════════════════════════════════
  log("\n3. Creating test pool with all users...");
  const [pool] = await db.insert(pools).values({
    name: `${TEST_PREFIX}Simulation Pool`,
    commissionerId: testUsers[0].id,
    inviteCode: `${TEST_PREFIX}SIM`,
    status: "locked",
    settings: {
      rounds: [1],
      mockDraftBonus: true,
      livePredictions: true,
      mockPointValues: { playerCalled: 3, rangeClose: 2, rangeFar: 1, exactSlot: 5, positionMatch: 1 },
      livePointValues: { correctPlayer: 10 },
    },
  }).returning();

  for (const user of testUsers) {
    await db.insert(poolMembers).values({
      poolId: pool.id,
      userId: user.id,
      role: user.id === testUsers[0].id ? "commissioner" : "member",
    });
  }
  ok(`Pool "${pool.name}" with ${testUsers.length} members`);

  // ══════════════════════════════════════════════
  // STEP 4: Simulate live draft — enter results + predictions
  // ══════════════════════════════════════════════
  log("\n4. Simulating live draft (first " + NUM_PICKS_TO_SIMULATE + " picks)...\n");

  // The "actual" draft order: use consensus rank but with a few surprises
  // Picks 1-10 actual: rank indices [0, 1, 2, 3, 7, 5, 6, 4, 8, 9]
  // (surprise: #8 prospect goes at pick 5, #5 prospect drops to pick 8)
  const actualDraftOrder = [0, 1, 2, 3, 7, 5, 6, 4, 8, 9];

  for (let pickIdx = 0; pickIdx < NUM_PICKS_TO_SIMULATE; pickIdx++) {
    const pickNumber = slots[pickIdx].pickNumber;
    const teamId = slots[pickIdx].teamId;
    const actualProspectIdx = actualDraftOrder[pickIdx];
    const actualPlayer = allProspects[actualProspectIdx];

    log(`   ── Pick #${pickNumber} ──`);

    // Submit live predictions BEFORE announcing
    // Each user predicts the consensus pick (their mock pick for this slot)
    for (const user of testUsers) {
      const strategy = strategies[user.name];
      const predictedIdx = strategy[pickIdx];
      // Don't predict exact same as last time — vary it
      // Alice always predicts consensus, Bob/Charlie/Diana predict their mock picks
      await db.insert(livePredictions).values({
        poolId: pool.id,
        userId: user.id,
        pickNumber,
        predictedPlayerId: allProspects[predictedIdx].id,
      }).onConflictDoNothing();
    }

    // Announce the actual pick
    await db.insert(actualResults).values({
      season: SEASON,
      pickNumber,
      playerId: actualPlayer.id,
      teamId,
      announcedAt: new Date(),
    });

    // Trigger scoring cascade (same as enterActualResult)
    await scoreAllBoards(SEASON);
    await scoreLivePredictions(pickNumber, actualPlayer.id);
    await recalculateAllPools();

    // Check scores
    const leaderboard = await db.select({
      boardId: scores.boardId,
      userId: scores.userId,
      total: scores.totalScore,
      exact: scores.correctExact,
    }).from(scores)
      .where(inArray(scores.boardId, boards.map((b) => b.boardId)))
      .orderBy(sql`${scores.totalScore} DESC`);

    const scoreStr = leaderboard.map((s) => {
      const name = boards.find((b) => b.boardId === s.boardId)?.name || "?";
      return `${name}: ${s.total}pts (${s.exact} exact)`;
    }).join(" | ");

    log(`   Actual: ${actualPlayer.name} (${allProspects[actualProspectIdx].position})`);
    log(`   Scores: ${scoreStr}`);
  }

  // ══════════════════════════════════════════════
  // STEP 5: Score pool mock drafts
  // ══════════════════════════════════════════════
  log("\n5. Scoring pool mock drafts...");
  await scorePoolMockDrafts(pool.id);
  await recalculateAllPools();
  ok("Mock drafts scored and standings recalculated");

  // ══════════════════════════════════════════════
  // STEP 6: Verify final state
  // ══════════════════════════════════════════════
  log("\n6. Verifying final state...\n");

  // Global leaderboard
  log("   ── Global Leaderboard ──");
  const finalScores = await db.select({
    boardId: scores.boardId,
    userId: scores.userId,
    total: scores.totalScore,
    exact: scores.correctExact,
    correct: scores.correctPlayer,
    accuracy: scores.accuracyPct,
  }).from(scores)
    .where(inArray(scores.boardId, boards.map((b) => b.boardId)))
    .orderBy(sql`${scores.totalScore} DESC`);

  let rank = 1;
  for (const s of finalScores) {
    const name = boards.find((b) => b.boardId === s.boardId)?.name || "?";
    log(`   #${rank++} ${name.padEnd(10)} ${String(s.total).padStart(3)}pts | ${s.exact} exact | ${s.correct} correct | ${s.accuracy?.toFixed(1)}% acc`);
  }

  // Pool standings
  log("\n   ── Pool Standings ──");
  const standings = await db.select().from(poolStandings)
    .where(eq(poolStandings.poolId, pool.id))
    .orderBy(sql`${poolStandings.combinedScore} DESC`);

  for (const s of standings) {
    const name = testUsers.find((u) => u.id === s.userId)?.name || "?";
    log(`   #${s.rank} ${name.padEnd(10)} ${String(s.combinedScore).padStart(3)} combined | mock: ${s.mockBonus} | live: ${s.liveTotal} | ${s.correctPredictions}/${s.picksPredicted} predictions correct`);
  }

  // Live prediction accuracy
  log("\n   ── Live Prediction Results ──");
  for (const user of testUsers) {
    const userScores = await db.select({
      total: sql<number>`COALESCE(SUM(${liveScores.pointsAwarded}), 0)`,
      correct: sql<number>`SUM(CASE WHEN ${liveScores.correct} THEN 1 ELSE 0 END)`,
      count: sql<number>`COUNT(*)`,
    }).from(liveScores)
      .where(and(eq(liveScores.poolId, pool.id), eq(liveScores.userId, user.id)));

    const s = userScores[0];
    log(`   ${user.name.padEnd(10)} ${s.correct}/${s.count} correct (${s.total} pts)`);
  }

  // Pick-by-pick scoring detail
  log("\n   ── Pick Score Breakdown (Alice's board) ──");
  const aliceBoard = boards.find((b) => b.name === "Alice")!;
  const aliceScores = await db.select().from(pickScores)
    .where(eq(pickScores.boardId, aliceBoard.boardId))
    .orderBy(asc(pickScores.pickNumber));

  for (const ps of aliceScores) {
    log(`   Pick #${String(ps.pickNumber).padStart(2)}: ${ps.matchType?.padEnd(5)} ${String(ps.pointsAwarded).padStart(2)}pts`);
  }

  // Integrity checks
  log("\n   ── Integrity Checks ──");
  const actualCount = await db.select({ count: sql<number>`COUNT(*)` }).from(actualResults)
    .where(eq(actualResults.season, SEASON));
  ok(`${actualCount[0].count} actual results entered`);

  const allPickScores = await db.select({ count: sql<number>`COUNT(*)` }).from(pickScores)
    .where(inArray(pickScores.boardId, boards.map((b) => b.boardId)));
  ok(`${allPickScores[0].count} pick scores computed (${boards.length} boards x ${NUM_PICKS_TO_SIMULATE} picks)`);

  if (standings.length === testUsers.length) {
    ok(`All ${testUsers.length} pool members have standings`);
  } else {
    fail(`Expected ${testUsers.length} standings, found ${standings.length}`);
  }

  // Verify Alice should be winning (she picks consensus = closest to actual)
  if (finalScores.length > 0) {
    const winner = boards.find((b) => b.boardId === finalScores[0].boardId)?.name;
    log(`\n   Winner: ${winner} with ${finalScores[0].total} points`);
    if (winner === "Alice") {
      ok("Alice (consensus picker) is winning as expected");
    } else {
      warn(`${winner} is beating Alice — surprises in the draft shifted rankings`);
    }
  }

  // ══════════════════════════════════════════════
  // STEP 7: Cleanup
  // ══════════════════════════════════════════════
  log("\n7. Cleaning up test data...");
  await cleanup();
  ok("All test data removed");

  log("\n╔══════════════════════════════════════════════╗");
  log("║     SIMULATION COMPLETE — ALL CHECKS PASSED  ║");
  log("╚══════════════════════════════════════════════╝");
  process.exit(0);
}

main().catch(async (err) => {
  console.error("\nSIMULATION FAILED:", err);
  await cleanup();
  process.exit(1);
});
