import { db } from "./index";
import { players } from "./schema";
import { asc } from "drizzle-orm";

async function main() {
  const all = await db.select({
    name: players.name, school: players.school, rank: players.rank,
    imageUrl: players.imageUrl, schoolLogoUrl: players.schoolLogoUrl,
  }).from(players).orderBy(asc(players.rank), asc(players.name));

  console.log(`Total players: ${all.length}`);
  console.log(`Ranked: ${all.filter(p => p.rank).length}`);
  console.log(`Unranked: ${all.filter(p => !p.rank).length}\n`);

  const noHeadshot = all.filter(p => !p.imageUrl);
  const noSchoolLogo = all.filter(p => !p.schoolLogoUrl);

  console.log(`Missing headshot: ${noHeadshot.length}`);
  for (const p of noHeadshot) console.log(`  ${p.name} (${p.school}) rank=${p.rank || "none"}`);

  console.log(`\nMissing school logo: ${noSchoolLogo.length}`);
  for (const p of noSchoolLogo) console.log(`  ${p.name} (${p.school}) rank=${p.rank || "none"}`);

  process.exit(0);
}
main();
