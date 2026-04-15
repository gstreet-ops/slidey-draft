import { db } from "./index";
import { players } from "./schema";
import { sql } from "drizzle-orm";
async function main() {
  const noImg = await db.select({ name: players.name, school: players.school, rank: players.rank }).from(players).where(sql`${players.imageUrl} IS NULL AND ${players.rank} IS NOT NULL`);
  console.log("Missing headshot:", noImg);
  const noLogo = await db.select({ name: players.name, school: players.school, rank: players.rank }).from(players).where(sql`${players.schoolLogoUrl} IS NULL AND ${players.rank} IS NOT NULL`);
  console.log("Missing school logo:", noLogo);
  process.exit(0);
}
main();
