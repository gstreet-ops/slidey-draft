/**
 * Drip Draft — Simulates picks arriving one at a time for testing the live UI.
 *
 * Usage:
 *   npx tsx src/db/drip-draft.ts [delaySeconds] [numPicks]
 *
 * Defaults: 20s between picks, 10 picks total.
 *
 * Calls POST /api/admin/result for each pick, which:
 *   - Locks the draft (first pick)
 *   - Auto-fills all boards
 *   - Scores all boards
 *
 * Cleanup: npx tsx src/db/drip-draft.ts --cleanup
 */

import { db } from "./index";
import { actualResults, draftOrder, players, scores, pickScores, appConfig } from "./schema";
import { eq, asc, isNotNull, and } from "drizzle-orm";
import { ACTUAL_DRAFT_ORDER } from "./simulation-config";

const SEASON = 2026;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// We need a session cookie to auth as admin.
// Instead of HTTP calls, we'll insert directly and call scoring.
import { scoreAllBoards } from "../lib/scoring";
import { isDraftLocked, setConfig } from "../lib/config";
import { autoFillAllBoards } from "../lib/bpa";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanup() {
  console.log("🧹 Cleaning up actual results and scores...");
  await db.delete(actualResults).where(eq(actualResults.season, SEASON));
  await db.delete(pickScores);
  await db.delete(scores);
  await db.delete(appConfig).where(eq(appConfig.key, "draft_locked"));
  console.log("✅ Cleaned up. Draft unlocked. Ready to run again.");
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--cleanup")) {
    await cleanup();
    return;
  }

  const delaySec = parseInt(args[0] || "20", 10);
  const numPicks = parseInt(args[1] || "10", 10);

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║          DRIP DRAFT — LIVE UI TEST           ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Delay: ${delaySec}s between picks`);
  console.log(`  Picks: ${numPicks}`);
  console.log(`  Open http://localhost:3000/live to watch\n`);

  // Get reference data
  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON))
    .orderBy(asc(draftOrder.pickNumber));

  const prospects = await db.select({ id: players.id, name: players.name, position: players.position })
    .from(players)
    .where(isNotNull(players.rank))
    .orderBy(asc(players.rank));

  if (slots.length < numPicks || prospects.length < numPicks) {
    console.log(`❌ Need ${numPicks} slots and prospects. Found ${slots.length} slots, ${prospects.length} prospects.`);
    process.exit(1);
  }

  // Check for existing results
  const existing = await db.select({ pickNumber: actualResults.pickNumber })
    .from(actualResults).where(eq(actualResults.season, SEASON));

  if (existing.length > 0) {
    console.log(`⚠️  Found ${existing.length} existing actual results. Run with --cleanup first.`);
    process.exit(1);
  }

  console.log("  Countdown: picks start in 5 seconds...\n");
  await sleep(5000);

  for (let i = 0; i < numPicks; i++) {
    const slot = slots[i];
    const prospectIdx = ACTUAL_DRAFT_ORDER[i];
    const player = prospects[prospectIdx];

    console.log(`  🏈 Pick #${slot.pickNumber}: ${player.name} (${player.position})`);

    // Insert actual result
    await db.insert(actualResults).values({
      season: SEASON,
      pickNumber: slot.pickNumber,
      playerId: player.id,
      teamId: slot.teamId,
      announcedAt: new Date(),
    });

    // Lock draft on first pick
    const locked = await isDraftLocked();
    if (!locked) {
      console.log("  🔒 Locking draft and auto-filling boards...");
      await setConfig("draft_locked", "true");
      await autoFillAllBoards(SEASON);
    }

    // Score all boards
    await scoreAllBoards(SEASON);
    console.log("  📊 Scored all boards\n");

    if (i < numPicks - 1) {
      console.log(`  ⏳ Next pick in ${delaySec}s...\n`);
      await sleep(delaySec * 1000);
    }
  }

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║          DRIP COMPLETE                       ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  ${numPicks} picks inserted. Watch /live for results.`);
  console.log(`  Run: npx tsx src/db/drip-draft.ts --cleanup`);
  console.log(`  to reset when done.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("DRIP FAILED:", err);
  process.exit(1);
});
