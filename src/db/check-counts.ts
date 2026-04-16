import { db } from "./index";
import { draftBoards, pools } from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  const boards = await db.select({ status: draftBoards.status, count: sql<number>`count(*)` }).from(draftBoards).groupBy(draftBoards.status);
  const poolCount = await db.select({ count: sql<number>`count(*)` }).from(pools);
  console.log("Boards by status:", boards);
  console.log("Pools:", poolCount[0]);
  process.exit(0);
}
main();
