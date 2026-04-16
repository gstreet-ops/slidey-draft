/**
 * Database Data Integrity Check
 * Run: npx tsx scripts/check-data-integrity.ts
 */

// @ts-ignore
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/db";
import { sql } from "drizzle-orm";
import {
  users,
  pools,
  poolMembers,
  draftBoards,
  livePredictions,
  triviaResponses,
  chatMessages,
  triviaQuestions,
  poolStandings,
} from "../src/db/schema";

async function runIntegrityCheck() {
  console.log("=== Data Integrity Check ===");
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const issues: string[] = [];

  // ── Counts ──
  console.log("--- Record Counts ---");
  const counts: Record<string, number> = {};

  const tables = [
    { name: "users", table: users },
    { name: "pools", table: pools },
    { name: "poolMembers", table: poolMembers },
    { name: "draftBoards", table: draftBoards },
    { name: "livePredictions", table: livePredictions },
    { name: "triviaQuestions", table: triviaQuestions },
    { name: "triviaResponses", table: triviaResponses },
    { name: "chatMessages", table: chatMessages },
    { name: "poolStandings", table: poolStandings },
  ];

  for (const { name, table } of tables) {
    const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(table);
    counts[name] = Number(row.count);
    console.log(`  ${name}: ${row.count}`);
  }

  // ── Orphaned predictions (pool doesn't exist) ──
  console.log("\n--- Orphan Checks ---");

  const orphanedPredictions = await db.execute(sql`
    SELECT COUNT(*) as count FROM live_predictions lp
    WHERE NOT EXISTS (SELECT 1 FROM pools p WHERE p.id = lp.pool_id)
  `);
  const opCount = Number((orphanedPredictions as any).rows?.[0]?.count ?? (orphanedPredictions as any)[0]?.count ?? 0);
  console.log(`  Orphaned predictions (no pool): ${opCount}`);
  if (opCount > 0) issues.push(`${opCount} orphaned live predictions`);

  const orphanedChat = await db.execute(sql`
    SELECT COUNT(*) as count FROM chat_messages cm
    WHERE NOT EXISTS (SELECT 1 FROM pools p WHERE p.id = cm.pool_id)
  `);
  const ocCount = Number((orphanedChat as any).rows?.[0]?.count ?? (orphanedChat as any)[0]?.count ?? 0);
  console.log(`  Orphaned chat messages (no pool): ${ocCount}`);
  if (ocCount > 0) issues.push(`${ocCount} orphaned chat messages`);

  const orphanedTrivia = await db.execute(sql`
    SELECT COUNT(*) as count FROM trivia_responses tr
    WHERE NOT EXISTS (SELECT 1 FROM pools p WHERE p.id = tr.pool_id)
  `);
  const otCount = Number((orphanedTrivia as any).rows?.[0]?.count ?? (orphanedTrivia as any)[0]?.count ?? 0);
  console.log(`  Orphaned trivia responses (no pool): ${otCount}`);
  if (otCount > 0) issues.push(`${otCount} orphaned trivia responses`);

  // ── Pool settings validation ──
  console.log("\n--- Pool Settings Validation ---");
  const allPools = await db.select({ id: pools.id, name: pools.name, settings: pools.settings, inviteCode: pools.inviteCode }).from(pools);

  let settingsIssues = 0;
  for (const pool of allPools) {
    const s = pool.settings as any;
    if (!s || typeof s !== "object") {
      console.log(`  WARN: Pool "${pool.name}" has invalid settings (not an object)`);
      settingsIssues++;
      continue;
    }
    // Check scoringMode
    if (!s.scoringMode) {
      console.log(`  WARN: Pool "${pool.name}" missing scoringMode`);
      settingsIssues++;
    }
    // Check triviaPointValues
    if (s.triviaPointValues) {
      if (!("easy" in s.triviaPointValues) || !("medium" in s.triviaPointValues) || !("hard" in s.triviaPointValues)) {
        console.log(`  WARN: Pool "${pool.name}" has incomplete triviaPointValues`);
        settingsIssues++;
      }
    }
  }
  if (settingsIssues === 0) console.log("  All pool settings valid.");

  // ── Unique invite codes ──
  console.log("\n--- Invite Code Uniqueness ---");
  const inviteCodes = allPools.map((p) => p.inviteCode);
  const uniqueCodes = new Set(inviteCodes);
  if (uniqueCodes.size < inviteCodes.length) {
    const diff = inviteCodes.length - uniqueCodes.size;
    console.log(`  WARNING: ${diff} duplicate invite code(s)!`);
    issues.push(`${diff} duplicate invite codes`);
  } else {
    console.log(`  All ${inviteCodes.length} invite codes are unique.`);
  }

  // ── Duplicate pool memberships ──
  console.log("\n--- Duplicate Pool Memberships ---");
  const dupes = await db.execute(sql`
    SELECT pool_id, user_id, COUNT(*) as count
    FROM pool_members
    GROUP BY pool_id, user_id
    HAVING COUNT(*) > 1
  `);
  const dupeRows = (dupes as any).rows ?? dupes;
  if (Array.isArray(dupeRows) && dupeRows.length > 0) {
    console.log(`  WARNING: ${dupeRows.length} duplicate membership(s) found!`);
    issues.push(`${dupeRows.length} duplicate pool memberships`);
  } else {
    console.log("  No duplicate memberships.");
  }

  // ── Summary ──
  console.log("\n\n=== SUMMARY ===");
  console.log(`Total records checked across ${tables.length} tables`);
  if (issues.length === 0) {
    console.log("STATUS: ALL CLEAR — no integrity issues found");
  } else {
    console.log(`STATUS: ${issues.length} ISSUE(S) FOUND:`);
    issues.forEach((i) => console.log(`  - ${i}`));
  }
}

runIntegrityCheck()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
