import { db } from "./index";
import { players } from "./schema";
import { sql, asc } from "drizzle-orm";

async function main() {
  const top20 = await db.select({ name: players.name, rank: players.rank, imageUrl: players.imageUrl })
    .from(players).where(sql`${players.rank} <= 20 AND ${players.imageUrl} IS NOT NULL`).orderBy(asc(players.rank));

  for (const p of top20) {
    try {
      const res = await fetch(p.imageUrl!, { method: "HEAD" });
      const status = res.ok ? "OK" : `BROKEN (${res.status})`;
      console.log(`  #${String(p.rank).padStart(2)} ${status.padEnd(15)} ${p.name}  ${p.imageUrl}`);
    } catch (e) {
      console.log(`  #${String(p.rank).padStart(2)} ERROR          ${p.name}`);
    }
  }
  process.exit(0);
}
main();
