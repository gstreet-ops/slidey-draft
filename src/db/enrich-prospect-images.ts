import { db } from "./index";
import { players, teams } from "./schema";
import { eq, isNotNull } from "drizzle-orm";

const SEARCH_URL =
  "https://site.api.espn.com/apis/common/v3/search?type=player&sport=football&limit=5&query=";

async function enrichProspectImages() {
  const prospects = await db
    .select()
    .from(players)
    .where(isNotNull(players.rank));

  console.log(`Found ${prospects.length} prospects to enrich`);

  let success = 0;
  let failed = 0;

  for (const prospect of prospects) {
    try {
      const res = await fetch(SEARCH_URL + encodeURIComponent(prospect.name));
      if (!res.ok) {
        console.log(`  SKIP ${prospect.name} — search returned ${res.status}`);
        failed++;
        continue;
      }

      const data = await res.json();
      const items: any[] = data.items || [];

      if (items.length === 0) {
        console.log(`  MISS ${prospect.name} (${prospect.school}) — no results`);
        failed++;
        continue;
      }

      // Pick the first football player result
      const match = items[0];
      const espnId = match.id;
      const league = match.league || "nfl";

      // Use the appropriate headshot path based on league
      const headshotBase =
        league === "college-football"
          ? "college-football"
          : "nfl";
      const imageUrl = `https://a.espncdn.com/i/headshots/${headshotBase}/players/full/${espnId}.png`;

      await db
        .update(players)
        .set({ imageUrl })
        .where(eq(players.id, prospect.id));

      console.log(`  OK   ${prospect.name} — ESPN ID ${espnId} (${league})`);
      success++;

      // Rate limit
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.log(`  ERR  ${prospect.name} — ${err}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} enriched, ${failed} failed`);
}

async function enrichTeamLogos() {
  const espnAbbreviations: Record<string, string> = {
    WAS: "WSH",
    JAC: "JAX",
  };

  const allTeams = await db.select().from(teams);
  console.log(`\nUpdating logos for ${allTeams.length} teams`);

  for (const team of allTeams) {
    const espnAbbr =
      espnAbbreviations[team.abbreviation] || team.abbreviation;
    const logoUrl = `https://a.espncdn.com/i/teamlogos/nfl/500/${espnAbbr}.png`;

    await db
      .update(teams)
      .set({ logoUrl })
      .where(eq(teams.id, team.id));

    console.log(`  OK   ${team.name} (${espnAbbr})`);
  }

  console.log("Team logos done");
}

async function main() {
  await enrichProspectImages();
  await enrichTeamLogos();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
