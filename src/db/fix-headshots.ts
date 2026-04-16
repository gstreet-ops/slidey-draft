import { db } from "./index";
import { players } from "./schema";
import { eq, sql, asc, isNotNull } from "drizzle-orm";

const SEARCH_URL = "https://site.api.espn.com/apis/common/v3/search?type=player&sport=football&limit=5&query=";

async function main() {
  // Get all ranked players
  const all = await db.select({ id: players.id, name: players.name, imageUrl: players.imageUrl, rank: players.rank })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  console.log(`Checking ${all.length} ranked prospects for broken headshots...\n`);

  let fixed = 0, alreadyGood = 0, notFound = 0;

  for (const p of all) {
    // Check if current URL works
    if (p.imageUrl) {
      try {
        const res = await fetch(p.imageUrl, { method: "HEAD" });
        if (res.ok) {
          alreadyGood++;
          continue;
        }
      } catch {}
    }

    // Need to fix — search ESPN for the correct ID
    try {
      const res = await fetch(SEARCH_URL + encodeURIComponent(p.name));
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (items.length > 0) {
          const espnId = items[0].id;
          const league = items[0].league || "college-football";
          const base = league === "nfl" ? "nfl" : "college-football";
          const imageUrl = `https://a.espncdn.com/i/headshots/${base}/players/full/${espnId}.png`;

          // Verify this URL works
          const check = await fetch(imageUrl, { method: "HEAD" });
          if (check.ok) {
            await db.update(players).set({ imageUrl }).where(eq(players.id, p.id));
            console.log(`  FIXED #${p.rank} ${p.name} → ${espnId}`);
            fixed++;
          } else {
            console.log(`  SKIP  #${p.rank} ${p.name} — headshot 404 for ID ${espnId}`);
            notFound++;
          }
        } else {
          console.log(`  SKIP  #${p.rank} ${p.name} — no ESPN search results`);
          notFound++;
        }
      }
      await new Promise(r => setTimeout(r, 200));
    } catch {
      notFound++;
    }
  }

  console.log(`\nDone: ${fixed} fixed, ${alreadyGood} already good, ${notFound} not found`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
