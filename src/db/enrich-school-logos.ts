import { db } from "./index";
import { players } from "./schema";
import { eq, isNotNull, asc } from "drizzle-orm";

const SCHOOL_ESPN_IDS: Record<string, number> = {
  "Alabama": 333, "Arizona State": 9, "Clemson": 228, "Florida": 57,
  "Georgia": 61, "Georgia Tech": 59, "Indiana": 84, "LSU": 99,
  "Miami": 2390, "Missouri": 142, "NC State": 152, "Nebraska": 158,
  "Notre Dame": 87, "Ohio State": 194, "Oklahoma": 201, "Oregon": 2483,
  "Penn State": 213, "South Carolina": 2579, "Tennessee": 2633,
  "Texas": 251, "Texas A&M": 245, "Texas Tech": 2641, "Toledo": 2649,
  "UCF": 2116, "USC": 30, "Utah": 254, "Washington": 264,
};

async function main() {
  const prospects = await db.select({ id: players.id, school: players.school })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  console.log(`Updating ${prospects.length} prospects with school logos...`);

  let updated = 0;
  for (const p of prospects) {
    const espnId = SCHOOL_ESPN_IDS[p.school];
    if (!espnId) { console.log(`  SKIP ${p.school}`); continue; }
    const logoUrl = `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png`;
    await db.update(players).set({ schoolLogoUrl: logoUrl }).where(eq(players.id, p.id));
    updated++;
  }

  console.log(`Done: ${updated} updated`);
  process.exit(0);
}
main();
