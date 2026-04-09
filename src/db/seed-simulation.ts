/**
 * Seed persistent simulation data.
 *
 * Creates 4 test users with mock draft boards in a pool.
 * Data stays in place so you can browse the app and watch
 * the live simulation via the admin panel.
 *
 * Run: npx tsx src/db/seed-simulation.ts
 * Teardown: npx tsx src/db/seed-simulation.ts --cleanup
 */

import { db } from "./index";
import {
  users, draftBoards, picks, draftOrder, players,
  pools, poolMembers, actualResults, scores, pickScores,
  poolStandings, livePredictions, liveScores, mockScores,
} from "./schema";
import { eq, asc, sql, isNotNull, inArray } from "drizzle-orm";

const SEASON = 2026;
const SIM_PREFIX = "SIM_";

const USERS = [
  { name: "Alice Martinez", email: "sim_alice@slidey.test", strategy: "consensus" },
  { name: "Bob Chen", email: "sim_bob@slidey.test", strategy: "contrarian" },
  { name: "Charlie Brooks", email: "sim_charlie@slidey.test", strategy: "bold" },
  { name: "Diana Okafor", email: "sim_diana@slidey.test", strategy: "mostly-consensus" },
];

// Pick strategies (index into ranked prospects array for each draft slot)
const STRATEGIES: Record<string, number[]> = {
  consensus:          [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
  contrarian:         [1,0,3,2,5,4,7,6,9,8,11,10,13,12,15,14,17,16,19,18,21,20,23,22,25,24,27,26,29,28,31,30],
  bold:               [5,8,2,12,0,15,3,18,1,20,10,7,22,14,6,25,9,28,4,30,11,16,13,19,17,24,21,26,23,29,27,31],
  "mostly-consensus": [0,1,8,3,4,2,6,7,5,9,10,15,12,13,14,11,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

// The "actual" draft order — consensus with a few surprises
// Prospect rank indices: swap #5/#8 and #4/#7 to create drama
export const ACTUAL_DRAFT_ORDER = [
  0, 1, 2, 3, 7, 5, 6, 4, 8, 9,
  10,11,12,13,14,15,16,17,18,19,
  20,21,22,23,24,25,26,27,28,29,
  30,31,
];

async function cleanup() {
  console.log("Cleaning up simulation data...");

  const simUsers = await db.select({ id: users.id }).from(users)
    .where(sql`${users.email} LIKE 'sim_%@slidey.test'`);
  const userIds = simUsers.map((u) => u.id);

  if (userIds.length === 0) {
    console.log("  No simulation data found.");
    return;
  }

  const simPools = await db.select({ id: pools.id }).from(pools)
    .where(sql`${pools.name} = 'Draft Day Showdown (Sim)'`);
  const poolIds = simPools.map((p) => p.id);

  if (poolIds.length > 0) {
    await db.delete(poolStandings).where(inArray(poolStandings.poolId, poolIds));
    await db.delete(liveScores).where(inArray(liveScores.poolId, poolIds));
    await db.delete(livePredictions).where(inArray(livePredictions.poolId, poolIds));
    await db.delete(mockScores).where(inArray(mockScores.poolId, poolIds));
    await db.delete(poolMembers).where(inArray(poolMembers.poolId, poolIds));
    await db.delete(pools).where(inArray(pools.id, poolIds));
  }

  const simBoards = await db.select({ id: draftBoards.id }).from(draftBoards)
    .where(inArray(draftBoards.createdBy, userIds));
  const boardIds = simBoards.map((b) => b.id);

  if (boardIds.length > 0) {
    await db.delete(pickScores).where(inArray(pickScores.boardId, boardIds));
    await db.delete(scores).where(inArray(scores.boardId, boardIds));
    await db.delete(picks).where(inArray(picks.boardId, boardIds));
    await db.delete(draftBoards).where(inArray(draftBoards.id, boardIds));
  }

  // Clear actual results (these are shared, only clear if simulation seeded them)
  await db.delete(actualResults).where(eq(actualResults.season, SEASON));

  await db.delete(users).where(inArray(users.id, userIds));
  console.log(`  Removed ${userIds.length} users, ${boardIds.length} boards, ${poolIds.length} pools, actual results.`);
}

async function seed() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║     SEEDING SIMULATION DATA                 ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await cleanup();

  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));
  const prospects = await db.select().from(players)
    .where(isNotNull(players.rank)).orderBy(asc(players.rank));

  if (slots.length < 32 || prospects.length < 32) {
    console.log(`ERROR: Need 32 slots and prospects. Found ${slots.length} slots, ${prospects.length} prospects.`);
    process.exit(1);
  }

  // Create users
  console.log("1. Creating simulation users...");
  const createdUsers: { id: string; name: string; strategy: string }[] = [];
  for (const u of USERS) {
    const [user] = await db.insert(users).values({
      email: u.email,
      name: u.name,
      status: "active",
    }).returning();
    createdUsers.push({ id: user.id, name: u.name, strategy: u.strategy });
    console.log(`   ${u.name} (${u.strategy})`);
  }

  // Create boards
  console.log("\n2. Creating mock draft boards...");
  const createdBoards: { userId: string; boardId: string; name: string }[] = [];
  for (const user of createdUsers) {
    const [board] = await db.insert(draftBoards).values({
      title: `${user.name.split(" ")[0]}'s Mock Draft`,
      season: SEASON,
      type: "mock",
      status: "published",
      createdBy: user.id,
      publishedAt: new Date(),
    }).returning();

    const strategy = STRATEGIES[user.strategy];
    for (let i = 0; i < 32; i++) {
      await db.insert(picks).values({
        boardId: board.id,
        pickNumber: slots[i].pickNumber,
        playerId: prospects[strategy[i]].id,
        teamId: slots[i].teamId,
      });
    }

    createdBoards.push({ userId: user.id, boardId: board.id, name: user.name });
    console.log(`   ${user.name}: 32 picks`);
  }

  // Create pool
  console.log("\n3. Creating simulation pool...");
  const [pool] = await db.insert(pools).values({
    name: "Draft Day Showdown (Sim)",
    description: "Simulation pool for testing live draft features",
    commissionerId: createdUsers[0].id,
    inviteCode: `${SIM_PREFIX}POOL`,
    status: "locked",
    settings: {
      rounds: [1],
      mockDraftBonus: true,
      livePredictions: true,
      mockPointValues: { playerCalled: 3, rangeClose: 2, rangeFar: 1, exactSlot: 5, positionMatch: 1 },
      livePointValues: { correctPlayer: 10 },
    },
  }).returning();

  for (const user of createdUsers) {
    await db.insert(poolMembers).values({
      poolId: pool.id,
      userId: user.id,
      role: user.id === createdUsers[0].id ? "commissioner" : "member",
    });
  }
  console.log(`   Pool: "${pool.name}" with ${createdUsers.length} members`);

  // Pre-seed live predictions for all 32 picks
  // Each user predicts based on their mock draft strategy
  console.log("\n4. Pre-seeding live predictions...");
  for (let i = 0; i < 32; i++) {
    const pickNumber = slots[i].pickNumber;
    for (const user of createdUsers) {
      const strategy = STRATEGIES[createdUsers.find((u) => u.id === user.id)!.strategy];
      await db.insert(livePredictions).values({
        poolId: pool.id,
        userId: user.id,
        pickNumber,
        predictedPlayerId: prospects[strategy[i]].id,
      }).onConflictDoNothing();
    }
  }
  console.log(`   32 picks x ${createdUsers.length} users = ${32 * createdUsers.length} predictions`);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║     SIMULATION DATA SEEDED                  ║");
  console.log("║                                             ║");
  console.log("║  Now go to /admin/simulate to run the       ║");
  console.log("║  live draft simulation pick by pick.        ║");
  console.log("║  Open /live in another tab to watch!        ║");
  console.log("╚══════════════════════════════════════════════╝");
}

const isCleanup = process.argv.includes("--cleanup");

(isCleanup ? cleanup() : seed())
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
