import { db } from "./index";
import { actualResults, scores, pickScores, liveScores, poolStandings } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(liveScores);
  await db.delete(poolStandings);
  await db.delete(pickScores);
  await db.delete(scores);
  await db.delete(actualResults).where(eq(actualResults.season, 2026));
  console.log("All results, scores, and standings cleared.");
  process.exit(0);
}
main();
