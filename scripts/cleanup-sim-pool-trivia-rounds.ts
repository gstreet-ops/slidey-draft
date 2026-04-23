/**
 * One-time cleanup: wipe all trivia rounds and queue entries for the sim pool.
 * Pool: 'Draft Day Showdown (Sim)' — 1da56f69-cf64-4045-ae4b-ba32c816bc17
 *
 * Run: npx tsx scripts/cleanup-sim-pool-trivia-rounds.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const SIM_POOL_ID = "1da56f69-cf64-4045-ae4b-ba32c816bc17";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const queueBefore = await db
    .select({ id: schema.poolTriviaQueue.id })
    .from(schema.poolTriviaQueue)
    .where(eq(schema.poolTriviaQueue.poolId, SIM_POOL_ID));
  const roundsBefore = await db
    .select({ id: schema.triviaRounds.id, label: schema.triviaRounds.label, status: schema.triviaRounds.status })
    .from(schema.triviaRounds)
    .where(eq(schema.triviaRounds.poolId, SIM_POOL_ID));

  console.log(`Before: ${queueBefore.length} queue entries, ${roundsBefore.length} rounds`);
  for (const r of roundsBefore) {
    console.log(`  round ${r.id.slice(0, 8)} "${r.label ?? "(no label)"}" status=${r.status}`);
  }

  // Queue entries first (FK to rounds; cascade on round delete should handle it, but be explicit).
  await db.delete(schema.poolTriviaQueue).where(eq(schema.poolTriviaQueue.poolId, SIM_POOL_ID));
  await db.delete(schema.triviaRounds).where(eq(schema.triviaRounds.poolId, SIM_POOL_ID));

  const queueAfter = await db
    .select({ id: schema.poolTriviaQueue.id })
    .from(schema.poolTriviaQueue)
    .where(eq(schema.poolTriviaQueue.poolId, SIM_POOL_ID));
  const roundsAfter = await db
    .select({ id: schema.triviaRounds.id })
    .from(schema.triviaRounds)
    .where(eq(schema.triviaRounds.poolId, SIM_POOL_ID));

  console.log(`After:  ${queueAfter.length} queue entries, ${roundsAfter.length} rounds`);
  if (queueAfter.length !== 0 || roundsAfter.length !== 0) {
    console.error("ERROR: cleanup incomplete");
    process.exit(1);
  }
  console.log("OK");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
