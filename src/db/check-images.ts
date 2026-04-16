import { db } from "./index";
import { players } from "./schema";
import { isNotNull, isNull, asc } from "drizzle-orm";

async function main() {
  const all = await db.select({ name: players.name, school: players.school, imageUrl: players.imageUrl, rank: players.rank })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  const missing = all.filter(p => !p.imageUrl);
  const hasImage = all.filter(p => p.imageUrl);

  console.log(`Headshots: ${hasImage.length}/${all.length}`);
  if (missing.length > 0) {
    console.log("\nMissing headshots:");
    for (const p of missing) console.log(`  #${p.rank} ${p.name} (${p.school})`);
  }

  // Unique schools
  const schools = [...new Set(all.map(p => p.school))].sort();
  console.log(`\nUnique schools (${schools.length}):`);
  for (const s of schools) console.log(`  ${s}`);

  process.exit(0);
}
main();
