import { db } from "./index";
import { pools } from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  // Update all pools: add scoringMode, trivia flag, and tiered triviaPointValues
  const allPools = await db.select({ id: pools.id, settings: pools.settings }).from(pools);

  for (const pool of allPools) {
    const raw = (pool.settings || {}) as Record<string, unknown>;

    // Add scoringMode if missing
    if (!raw.scoringMode) raw.scoringMode = "standard";

    // Add trivia flag if missing
    if (raw.trivia === undefined) raw.trivia = true;

    // Upgrade triviaPointValues from flat to tiered
    const tpv = raw.triviaPointValues as Record<string, unknown> | undefined;
    if (!tpv || !("easy" in (tpv || {}))) {
      raw.triviaPointValues = { easy: 3, medium: 5, hard: 10 };
    }

    await db
      .update(pools)
      .set({ settings: raw })
      .where(sql`${pools.id} = ${pool.id}`);

    console.log(`Updated pool ${pool.id}`);
  }

  console.log(`\nDone. Updated ${allPools.length} pool(s).`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
