/**
 * Draft simulation — tests key flows against the real database:
 * 1. Create a test board
 * 2. Make picks (including duplicate prevention)
 * 3. Remove a pick and re-pick
 * 4. Auto-fill remaining slots
 * 5. Verify no duplicate players on the board
 * 6. Clean up test data
 */

import { db } from "./index";
import { draftBoards, picks, players, draftOrder, teams } from "./schema";
import { eq, asc, and, sql, isNotNull } from "drizzle-orm";

const TEST_BOARD_TITLE = "__SIMULATION_TEST__";
const SEASON = 2026;

async function cleanup() {
  // Delete any existing test boards and their picks
  const testBoards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(eq(draftBoards.title, TEST_BOARD_TITLE));

  for (const b of testBoards) {
    await db.delete(picks).where(eq(picks.boardId, b.id));
    await db.delete(draftBoards).where(eq(draftBoards.id, b.id));
  }
}

async function main() {
  console.log("=== DRAFT DAY CHALLENGE SIMULATION ===\n");

  // Cleanup any leftover test data
  await cleanup();

  // ── Step 1: Create test board ──
  console.log("1. Creating test board...");
  const [board] = await db
    .insert(draftBoards)
    .values({ title: TEST_BOARD_TITLE, season: SEASON, type: "mock" })
    .returning();
  console.log(`   OK — Board ID: ${board.id}\n`);

  // ── Get reference data ──
  const slots = await db
    .select()
    .from(draftOrder)
    .where(eq(draftOrder.season, SEASON))
    .orderBy(asc(draftOrder.pickNumber));
  console.log(`   Draft order: ${slots.length} slots`);

  const rankedPlayers = await db
    .select({ id: players.id, name: players.name, rank: players.rank, position: players.position })
    .from(players)
    .where(isNotNull(players.rank))
    .orderBy(asc(players.rank));
  console.log(`   Ranked prospects: ${rankedPlayers.length}\n`);

  if (slots.length === 0 || rankedPlayers.length === 0) {
    console.log("ERROR: No draft order or players found. Aborting.");
    await cleanup();
    process.exit(1);
  }

  // ── Step 2: Make first 5 picks ──
  console.log("2. Making first 5 picks...");
  for (let i = 0; i < 5; i++) {
    const slot = slots[i];
    const player = rankedPlayers[i];
    await db.insert(picks).values({
      boardId: board.id,
      pickNumber: slot.pickNumber,
      playerId: player.id,
      teamId: slot.teamId,
    });
    console.log(`   Pick #${slot.pickNumber}: ${player.name} (${player.position})`);
  }
  console.log("");

  // ── Step 3: Test duplicate player prevention ──
  console.log("3. Testing duplicate player prevention...");
  const duplicatePlayer = rankedPlayers[0]; // Already picked at #1
  const emptySlot = slots[5]; // Pick #6

  try {
    await db.insert(picks).values({
      boardId: board.id,
      pickNumber: emptySlot.pickNumber,
      playerId: duplicatePlayer.id,
      teamId: emptySlot.teamId,
    });
    console.log("   FAIL — Duplicate player was allowed!");
    await cleanup();
    process.exit(1);
  } catch (err: any) {
    console.log(`   OK — Duplicate correctly rejected: ${duplicatePlayer.name} already on board`);
  }
  console.log("");

  // ── Step 4: Test duplicate pick number prevention ──
  console.log("4. Testing duplicate pick number prevention...");
  const differentPlayer = rankedPlayers[10];
  const takenSlot = slots[0]; // Pick #1, already filled

  try {
    await db.insert(picks).values({
      boardId: board.id,
      pickNumber: takenSlot.pickNumber,
      playerId: differentPlayer.id,
      teamId: takenSlot.teamId,
    });
    console.log("   FAIL — Duplicate pick number was allowed!");
    await cleanup();
    process.exit(1);
  } catch (err: any) {
    console.log(`   OK — Pick #${takenSlot.pickNumber} correctly blocked (already filled)`);
  }
  console.log("");

  // ── Step 5: Remove a pick and re-pick ──
  console.log("5. Remove pick #3 and re-pick with a different player...");
  const pick3 = await db
    .select()
    .from(picks)
    .where(and(eq(picks.boardId, board.id), eq(picks.pickNumber, 3)));

  if (pick3.length === 0) {
    console.log("   FAIL — Pick #3 not found");
    await cleanup();
    process.exit(1);
  }

  await db.delete(picks).where(eq(picks.id, pick3[0].id));
  console.log(`   Removed: ${rankedPlayers[2].name} from pick #3`);

  // Re-pick with a different player (rank #10)
  const newPlayer = rankedPlayers[9];
  await db.insert(picks).values({
    boardId: board.id,
    pickNumber: 3,
    playerId: newPlayer.id,
    teamId: slots[2].teamId,
  });
  console.log(`   Re-picked: ${newPlayer.name} at #3`);

  // Now the original player (rank #3) should be available again
  try {
    await db.insert(picks).values({
      boardId: board.id,
      pickNumber: emptySlot.pickNumber, // Pick #6
      playerId: rankedPlayers[2].id,    // Originally at #3, now freed
      teamId: emptySlot.teamId,
    });
    console.log(`   OK — ${rankedPlayers[2].name} correctly available after removal, placed at #${emptySlot.pickNumber}`);
  } catch (err: any) {
    console.log(`   FAIL — Freed player rejected: ${err.message}`);
    await cleanup();
    process.exit(1);
  }
  console.log("");

  // ── Step 6: Auto-fill remaining (simulate the logic) ──
  console.log("6. Auto-filling remaining picks by rank...");
  const existingPicks = await db
    .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.boardId, board.id));

  const pickedNumbers = new Set(existingPicks.map((p) => p.pickNumber));
  const pickedPlayerIds = new Set(existingPicks.map((p) => p.playerId));
  const emptySlots = slots.filter((s) => !pickedNumbers.has(s.pickNumber));

  console.log(`   ${existingPicks.length} picks made, ${emptySlots.length} slots remaining`);

  let filled = 0;
  const usedIds = new Set(pickedPlayerIds);
  for (const slot of emptySlots) {
    const next = rankedPlayers.find((p) => !usedIds.has(p.id));
    if (!next) break;
    await db.insert(picks).values({
      boardId: board.id,
      pickNumber: slot.pickNumber,
      playerId: next.id,
      teamId: slot.teamId,
      autoFilled: true,
    });
    usedIds.add(next.id);
    filled++;
  }
  console.log(`   Filled ${filled} picks`);
  console.log("");

  // ── Step 7: Verify integrity ──
  console.log("7. Verifying board integrity...");
  const allPicks = await db
    .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.boardId, board.id))
    .orderBy(asc(picks.pickNumber));

  // Check total
  console.log(`   Total picks: ${allPicks.length}`);

  // Check no duplicate players
  const playerIds = allPicks.map((p) => p.playerId);
  const uniquePlayerIds = new Set(playerIds);
  if (playerIds.length !== uniquePlayerIds.size) {
    console.log(`   FAIL — Duplicate players found! ${playerIds.length} picks but only ${uniquePlayerIds.size} unique players`);

    // Find the dupes
    const seen = new Set<string>();
    for (const p of allPicks) {
      if (seen.has(p.playerId)) {
        console.log(`   Duplicate: player ${p.playerId} at pick #${p.pickNumber}`);
      }
      seen.add(p.playerId);
    }
    await cleanup();
    process.exit(1);
  }
  console.log(`   OK — All ${uniquePlayerIds.size} players are unique`);

  // Check no duplicate pick numbers
  const pickNumbers = allPicks.map((p) => p.pickNumber);
  const uniquePickNumbers = new Set(pickNumbers);
  if (pickNumbers.length !== uniquePickNumbers.size) {
    console.log(`   FAIL — Duplicate pick numbers found!`);
    await cleanup();
    process.exit(1);
  }
  console.log(`   OK — All ${uniquePickNumbers.size} pick numbers are unique`);

  // Check sequential
  const expectedNumbers = slots.slice(0, allPicks.length).map((s) => s.pickNumber);
  const missingSlots = expectedNumbers.filter((n) => !uniquePickNumbers.has(n));
  if (missingSlots.length > 0) {
    console.log(`   WARN — Missing picks at slots: ${missingSlots.join(", ")}`);
  } else {
    console.log(`   OK — All slots filled sequentially`);
  }

  // ── Step 8: Check scouting data enrichment ──
  console.log("\n8. Checking scouting data enrichment...");
  const enriched = await db
    .select({ name: players.name, grade: players.grade, nflComparison: players.nflComparison, imageUrl: players.imageUrl })
    .from(players)
    .where(isNotNull(players.rank))
    .orderBy(asc(players.rank));

  let withGrade = 0, withComp = 0, withImage = 0;
  for (const p of enriched) {
    if (p.grade) withGrade++;
    if (p.nflComparison) withComp++;
    if (p.imageUrl) withImage++;
  }
  console.log(`   ${enriched.length} ranked prospects`);
  console.log(`   ${withGrade}/${enriched.length} have grades`);
  console.log(`   ${withComp}/${enriched.length} have NFL comparisons`);
  console.log(`   ${withImage}/${enriched.length} have headshot images`);

  if (withGrade < enriched.length * 0.9) {
    console.log("   WARN — Many prospects missing grades");
  }

  // ── Cleanup ──
  console.log("\n9. Cleaning up test data...");
  await cleanup();
  console.log("   OK — Test board deleted");

  console.log("\n=== SIMULATION COMPLETE — ALL CHECKS PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("SIMULATION FAILED:", err);
  cleanup().then(() => process.exit(1));
});
