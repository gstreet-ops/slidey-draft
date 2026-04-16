import { db } from "./index";
import { pools, actualResults, draftBoards, users } from "./schema";
import { sql, eq } from "drizzle-orm";

async function main() {
  const p = await db.select({ id: pools.id, name: pools.name, status: pools.status }).from(pools);
  console.log("Pools:", p);

  const r = await db.select({ count: sql<number>`count(*)` }).from(actualResults).where(eq(actualResults.season, 2026));
  console.log("Actual results:", r[0]);

  const simUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
    .where(sql`${users.email} LIKE 'sim_%@slidey.test'`);
  console.log("Sim users:", simUsers.length);

  const boards = await db.select({ id: draftBoards.id, title: draftBoards.title, status: draftBoards.status, createdBy: draftBoards.createdBy }).from(draftBoards);
  console.log("All boards:", boards.map(b => `${b.title} (${b.status}) by ${b.createdBy}`));

  process.exit(0);
}
main();
