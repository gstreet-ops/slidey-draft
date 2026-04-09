/**
 * Import 2026 NFL Draft prospects from ESPN's API.
 *
 * 1. Fetches all draft athlete refs (paginated)
 * 2. Fetches each athlete's detail (name, position, school, height, weight, rank)
 * 3. Removes old unranked players (2025 class)
 * 4. Upserts new prospects with headshots and school logos
 *
 * Run: npx tsx src/db/import-espn-prospects.ts
 */

import { db } from "./index";
import { players, picks } from "./schema";
import { eq, isNull, sql, and, inArray } from "drizzle-orm";

const SEASON = 2026;
const BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons";
const BATCH_SIZE = 10;

const SCHOOL_ESPN_IDS: Record<string, number> = {
  "Alabama": 333, "Arizona": 12, "Arizona State": 9, "Arkansas": 8,
  "Auburn": 2, "Boise State": 68, "Boston College": 103, "Bowling Green": 189,
  "BYU": 252, "California": 25, "Cincinnati": 2132, "Clemson": 228,
  "Colorado": 38, "Duke": 150, "East Carolina": 151, "Florida": 57,
  "Florida State": 52, "Georgia": 61, "Georgia Tech": 59,
  "Houston": 248, "Illinois": 356, "Indiana": 84, "Iowa": 2294,
  "Iowa State": 66, "Kansas": 2305, "Kansas State": 2306,
  "Kentucky": 96, "Louisville": 97, "LSU": 99, "Marshall": 276,
  "Maryland": 120, "Memphis": 235, "Miami": 2390, "Michigan": 130,
  "Michigan State": 127, "Minnesota": 135, "Mississippi State": 344,
  "Missouri": 142, "Navy": 2426, "NC State": 152, "Nebraska": 158,
  "North Carolina": 153, "North Dakota State": 2449, "Northern Iowa": 2460,
  "Northwestern": 77, "Notre Dame": 87, "Ohio State": 194,
  "Oklahoma": 201, "Oklahoma State": 197, "Ole Miss": 145,
  "Oregon": 2483, "Oregon State": 204, "Penn State": 213,
  "Pitt": 221, "Purdue": 2509, "Rutgers": 164,
  "San Diego State": 21, "SMU": 2567, "South Carolina": 2579,
  "Stanford": 24, "Syracuse": 183, "TCU": 2628, "Temple": 218,
  "Tennessee": 2633, "Texas": 251, "Texas A&M": 245,
  "Texas Tech": 2641, "Toledo": 2649, "Tulane": 2655,
  "UCF": 2116, "UCLA": 26, "USC": 30, "Utah": 254,
  "Vanderbilt": 238, "Virginia": 258, "Virginia Tech": 259,
  "Wake Forest": 154, "Washington": 264, "Washington State": 265,
  "West Virginia": 277, "Wisconsin": 275, "Wyoming": 2751,
};

type ProspectData = {
  name: string;
  position: string;
  school: string;
  height: string | null;
  weight: number | null;
  espnId: string;
  rank: number;
};

async function fetchAthleteIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE}/${SEASON}/draft/athletes?limit=50&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) { console.log(`  Page ${page} failed: ${res.status}`); break; }
    const data = await res.json();
    totalPages = data.pageCount;

    for (const item of data.items) {
      const match = item["$ref"]?.match(/athletes\/(\d+)/);
      if (match) ids.push(match[1]);
    }

    console.log(`  Page ${page}/${totalPages}: ${data.items.length} athletes`);
    page++;
    await new Promise(r => setTimeout(r, 100));
  }

  return ids;
}

function convertHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const remaining = Math.round(inches % 12);
  return `${ft}-${remaining}`;
}

async function fetchAthleteDetail(id: string): Promise<ProspectData | null> {
  try {
    const url = `${BASE}/${SEASON}/draft/athletes/${id}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();

    // Get position
    let position = "UNKNOWN";
    if (d.position && d.position["$ref"]) {
      try {
        const posRes = await fetch(d.position["$ref"]);
        if (posRes.ok) {
          const posData = await posRes.json();
          position = posData.abbreviation || posData.displayName || "UNKNOWN";
        }
      } catch {}
    }

    // Get school/team
    let school = "Unknown";
    if (d.team && d.team["$ref"]) {
      try {
        const teamRes = await fetch(d.team["$ref"]);
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          school = teamData.shortDisplayName || teamData.displayName || "Unknown";
        }
      } catch {}
    }

    // Get rank
    let rank = 999;
    if (d.rank) {
      rank = d.rank;
    }

    return {
      name: d.fullName || d.displayName || `${d.firstName} ${d.lastName}`,
      position,
      school,
      height: d.height ? convertHeight(d.height) : null,
      weight: d.weight || null,
      espnId: id,
      rank,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  IMPORT ESPN 2026 DRAFT PROSPECTS           ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Step 1: Fetch all athlete IDs
  console.log("1. Fetching athlete IDs from ESPN...");
  const allIds = await fetchAthleteIds();
  console.log(`   Total: ${allIds.length} athletes\n`);

  // Step 2: Fetch details for first 250 (covers the 230 ranked)
  const targetCount = Math.min(allIds.length, 300);
  console.log(`2. Fetching details for ${targetCount} athletes...\n`);

  const prospects: ProspectData[] = [];

  for (let i = 0; i < targetCount; i += BATCH_SIZE) {
    const batch = allIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(id => fetchAthleteDetail(id)));

    for (const r of results) {
      if (r && r.position !== "UNKNOWN") prospects.push(r);
    }

    const pct = Math.round(((i + batch.length) / targetCount) * 100);
    process.stdout.write(`   ${i + batch.length}/${targetCount} (${pct}%)\r`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n   Fetched ${prospects.length} valid prospects\n`);

  // Sort by rank
  prospects.sort((a, b) => a.rank - b.rank);

  // Show top 10
  console.log("   Top 10:");
  for (const p of prospects.slice(0, 10)) {
    console.log(`   #${p.rank} ${p.name} (${p.position}) - ${p.school}`);
  }

  // Step 3: Remove old players not used in any picks
  console.log("\n3. Cleaning up old players...");
  const pickedPlayerIds = await db.select({ playerId: picks.playerId }).from(picks);
  const pickedSet = new Set(pickedPlayerIds.map(p => p.playerId));

  const existingPlayers = await db.select({ id: players.id, name: players.name }).from(players);
  let removed = 0;
  for (const p of existingPlayers) {
    if (!pickedSet.has(p.id)) {
      // Check if this player exists in new data (by name)
      const inNew = prospects.some(np => np.name === p.name);
      if (!inNew) {
        await db.delete(players).where(eq(players.id, p.id));
        removed++;
      }
    }
  }
  console.log(`   Removed ${removed} unused old players\n`);

  // Step 4: Upsert prospects
  console.log("4. Upserting prospects...");
  let inserted = 0, updated = 0;

  for (const p of prospects) {
    const schoolEspnId = SCHOOL_ESPN_IDS[p.school];
    const schoolLogoUrl = schoolEspnId
      ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${schoolEspnId}.png`
      : null;
    const imageUrl = `https://a.espncdn.com/i/headshots/college-football/players/full/${p.espnId}.png`;

    // Check if player exists by name
    const [existing] = await db.select({ id: players.id })
      .from(players).where(eq(players.name, p.name));

    if (existing) {
      await db.update(players).set({
        position: p.position,
        school: p.school,
        height: p.height,
        weight: p.weight,
        rank: p.rank <= 250 ? p.rank : null,
        imageUrl,
        schoolLogoUrl,
      }).where(eq(players.id, existing.id));
      updated++;
    } else {
      await db.insert(players).values({
        name: p.name,
        position: p.position,
        school: p.school,
        height: p.height,
        weight: p.weight,
        rank: p.rank <= 250 ? p.rank : null,
        imageUrl,
        schoolLogoUrl,
      });
      inserted++;
    }
  }

  console.log(`   Inserted: ${inserted}, Updated: ${updated}\n`);

  // Summary
  const finalCount = await db.select({ count: sql<number>`count(*)` }).from(players);
  const rankedCount = await db.select({ count: sql<number>`count(*)` }).from(players).where(sql`rank IS NOT NULL`);
  console.log(`Final state: ${finalCount[0].count} total players, ${rankedCount[0].count} ranked`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
