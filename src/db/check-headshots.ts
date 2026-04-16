import { db } from "./index";
import { players } from "./schema";
import { sql, asc } from "drizzle-orm";

async function main() {
  const top20 = await db.select({ name: players.name, rank: players.rank, imageUrl: players.imageUrl })
    .from(players).where(sql`${players.rank} <= 20`).orderBy(asc(players.rank));

  for (const p of top20) {
    const status = p.imageUrl ? "OK" : "MISSING";
    console.log(`  #${String(p.rank).padStart(2)} ${status.padEnd(7)} ${p.name}`);
  }

  const totalMissing = await db.select({ count: sql<number>`count(*)` })
    .from(players).where(sql`${players.rank} IS NOT NULL AND ${players.imageUrl} IS NULL`);
  console.log(`\nTotal ranked missing headshots: ${totalMissing[0].count}`);
  process.exit(0);
}
main();
