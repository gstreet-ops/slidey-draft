import { db } from "./index";
import { players } from "./schema";
import { eq, isNull, or } from "drizzle-orm";

const SEARCH_URL = "https://site.api.espn.com/apis/common/v3/search?type=player&sport=football&limit=5&query=";

const SCHOOL_ESPN_IDS: Record<string, number> = {
  "Alabama": 333, "Arizona": 12, "Arizona State": 9, "Arkansas": 8,
  "Boise State": 68, "Boston College": 103, "Bowling Green": 189,
  "Clemson": 228, "Colorado": 38, "East Carolina": 151,
  "Florida": 57, "Georgia": 61, "Georgia Tech": 59, "Indiana": 84,
  "Iowa State": 66, "Kentucky": 96, "LSU": 99, "Miami": 2390,
  "Michigan": 130, "Minnesota": 135, "Missouri": 142,
  "NC State": 152, "Nebraska": 158, "North Carolina": 153,
  "North Dakota State": 2449, "Notre Dame": 87,
  "Ohio State": 194, "Oklahoma": 201, "Ole Miss": 145, "Oregon": 2483,
  "Penn State": 213, "South Carolina": 2579, "Tennessee": 2633,
  "Texas": 251, "Texas A&M": 245, "Texas Tech": 2641, "Toledo": 2649,
  "UCF": 2116, "USC": 30, "Utah": 254, "Washington": 264,
  "West Virginia": 277,
};

async function main() {
  const toEnrich = await db.select()
    .from(players)
    .where(or(isNull(players.imageUrl), isNull(players.schoolLogoUrl)));

  console.log(`Found ${toEnrich.length} players to enrich\n`);

  let headshots = 0, logos = 0, failed = 0;

  for (const player of toEnrich) {
    const updates: Record<string, unknown> = {};

    // Headshot
    if (!player.imageUrl) {
      try {
        const res = await fetch(SEARCH_URL + encodeURIComponent(player.name));
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          if (items.length > 0) {
            const espnId = items[0].id;
            const league = items[0].league || "nfl";
            const base = league === "college-football" ? "college-football" : "nfl";
            updates.imageUrl = `https://a.espncdn.com/i/headshots/${base}/players/full/${espnId}.png`;
            headshots++;
          }
        }
        await new Promise(r => setTimeout(r, 200));
      } catch { failed++; }
    }

    // School logo
    if (!player.schoolLogoUrl) {
      const espnId = SCHOOL_ESPN_IDS[player.school];
      if (espnId) {
        updates.schoolLogoUrl = `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png`;
        logos++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(players).set(updates).where(eq(players.id, player.id));
      console.log(`  OK  ${player.name} (${player.school})${updates.imageUrl ? " +headshot" : ""}${updates.schoolLogoUrl ? " +logo" : ""}`);
    } else {
      console.log(`  SKIP ${player.name}`);
    }
  }

  console.log(`\nDone: ${headshots} headshots, ${logos} school logos, ${failed} failures`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
