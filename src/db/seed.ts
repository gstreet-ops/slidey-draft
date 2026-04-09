import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ── All 32 NFL Teams ───────────────────────────────
const NFL_TEAMS = [
  { name: "Arizona Cardinals",      abbreviation: "ARI", conference: "NFC", division: "West",  primaryColor: "#97233F", secondaryColor: "#000000" },
  { name: "Atlanta Falcons",        abbreviation: "ATL", conference: "NFC", division: "South", primaryColor: "#A71930", secondaryColor: "#000000" },
  { name: "Baltimore Ravens",       abbreviation: "BAL", conference: "AFC", division: "North", primaryColor: "#241773", secondaryColor: "#9E7C0C" },
  { name: "Buffalo Bills",          abbreviation: "BUF", conference: "AFC", division: "East",  primaryColor: "#00338D", secondaryColor: "#C60C30" },
  { name: "Carolina Panthers",      abbreviation: "CAR", conference: "NFC", division: "South", primaryColor: "#0085CA", secondaryColor: "#101820" },
  { name: "Chicago Bears",          abbreviation: "CHI", conference: "NFC", division: "North", primaryColor: "#0B162A", secondaryColor: "#C83803" },
  { name: "Cincinnati Bengals",     abbreviation: "CIN", conference: "AFC", division: "North", primaryColor: "#FB4F14", secondaryColor: "#000000" },
  { name: "Cleveland Browns",       abbreviation: "CLE", conference: "AFC", division: "North", primaryColor: "#311D00", secondaryColor: "#FF3C00" },
  { name: "Dallas Cowboys",         abbreviation: "DAL", conference: "NFC", division: "East",  primaryColor: "#003594", secondaryColor: "#869397" },
  { name: "Denver Broncos",         abbreviation: "DEN", conference: "AFC", division: "West",  primaryColor: "#FB4F14", secondaryColor: "#002244" },
  { name: "Detroit Lions",          abbreviation: "DET", conference: "NFC", division: "North", primaryColor: "#0076B6", secondaryColor: "#B0B7BC" },
  { name: "Green Bay Packers",      abbreviation: "GB",  conference: "NFC", division: "North", primaryColor: "#203731", secondaryColor: "#FFB612" },
  { name: "Houston Texans",         abbreviation: "HOU", conference: "AFC", division: "South", primaryColor: "#03202F", secondaryColor: "#A71930" },
  { name: "Indianapolis Colts",     abbreviation: "IND", conference: "AFC", division: "South", primaryColor: "#002C5F", secondaryColor: "#A2AAAD" },
  { name: "Jacksonville Jaguars",   abbreviation: "JAX", conference: "AFC", division: "South", primaryColor: "#006778", secondaryColor: "#9F792C" },
  { name: "Kansas City Chiefs",     abbreviation: "KC",  conference: "AFC", division: "West",  primaryColor: "#E31837", secondaryColor: "#FFB81C" },
  { name: "Las Vegas Raiders",      abbreviation: "LV",  conference: "AFC", division: "West",  primaryColor: "#000000", secondaryColor: "#A5ACAF" },
  { name: "Los Angeles Chargers",   abbreviation: "LAC", conference: "AFC", division: "West",  primaryColor: "#0080C6", secondaryColor: "#FFC20E" },
  { name: "Los Angeles Rams",       abbreviation: "LAR", conference: "NFC", division: "West",  primaryColor: "#003594", secondaryColor: "#FFA300" },
  { name: "Miami Dolphins",          abbreviation: "MIA", conference: "AFC", division: "East",  primaryColor: "#008E97", secondaryColor: "#FC4C02" },
  { name: "Minnesota Vikings",      abbreviation: "MIN", conference: "NFC", division: "North", primaryColor: "#4F2683", secondaryColor: "#FFC62F" },
  { name: "New England Patriots",   abbreviation: "NE",  conference: "AFC", division: "East",  primaryColor: "#002244", secondaryColor: "#C60C30" },
  { name: "New Orleans Saints",     abbreviation: "NO",  conference: "NFC", division: "South", primaryColor: "#D3BC8D", secondaryColor: "#101820" },
  { name: "New York Giants",        abbreviation: "NYG", conference: "NFC", division: "East",  primaryColor: "#0B2265", secondaryColor: "#A71930" },
  { name: "New York Jets",          abbreviation: "NYJ", conference: "AFC", division: "East",  primaryColor: "#125740", secondaryColor: "#000000" },
  { name: "Philadelphia Eagles",    abbreviation: "PHI", conference: "NFC", division: "East",  primaryColor: "#004C54", secondaryColor: "#A5ACAF" },
  { name: "Pittsburgh Steelers",    abbreviation: "PIT", conference: "AFC", division: "North", primaryColor: "#FFB612", secondaryColor: "#101820" },
  { name: "San Francisco 49ers",    abbreviation: "SF",  conference: "NFC", division: "West",  primaryColor: "#AA0000", secondaryColor: "#B3995D" },
  { name: "Seattle Seahawks",       abbreviation: "SEA", conference: "NFC", division: "West",  primaryColor: "#002244", secondaryColor: "#69BE28" },
  { name: "Tampa Bay Buccaneers",   abbreviation: "TB",  conference: "NFC", division: "South", primaryColor: "#D50A0A", secondaryColor: "#34302B" },
  { name: "Tennessee Titans",       abbreviation: "TEN", conference: "AFC", division: "South", primaryColor: "#0C2340", secondaryColor: "#4B92DB" },
  { name: "Washington Commanders",  abbreviation: "WAS", conference: "NFC", division: "East",  primaryColor: "#5A1414", secondaryColor: "#FFB612" },
];

// ── 2026 Draft Order (Round 1) ─────────────────────
const DRAFT_ORDER_2026 = [
  { pick: 1,  team: "LV",  note: "" },
  { pick: 2,  team: "NYJ", note: "" },
  { pick: 3,  team: "ARI", note: "" },
  { pick: 4,  team: "TEN", note: "" },
  { pick: 5,  team: "NYG", note: "" },
  { pick: 6,  team: "CLE", note: "" },
  { pick: 7,  team: "WAS", note: "" },
  { pick: 8,  team: "NO",  note: "" },
  { pick: 9,  team: "KC",  note: "" },
  { pick: 10, team: "CIN", note: "" },
  { pick: 11, team: "MIA", note: "" },
  { pick: 12, team: "DAL", note: "" },
  { pick: 13, team: "LAR", note: "from ATL" },
  { pick: 14, team: "BAL", note: "" },
  { pick: 15, team: "TB",  note: "" },
  { pick: 16, team: "NYJ", note: "from IND" },
  { pick: 17, team: "DET", note: "" },
  { pick: 18, team: "MIN", note: "" },
  { pick: 19, team: "CAR", note: "" },
  { pick: 20, team: "DAL", note: "from GB" },
  { pick: 21, team: "PIT", note: "" },
  { pick: 22, team: "LAC", note: "" },
  { pick: 23, team: "PHI", note: "" },
  { pick: 24, team: "CLE", note: "from JAX" },
  { pick: 25, team: "CHI", note: "" },
  { pick: 26, team: "BUF", note: "" },
  { pick: 27, team: "SF",  note: "" },
  { pick: 28, team: "HOU", note: "" },
  { pick: 29, team: "KC",  note: "from LAR" },
  { pick: 30, team: "MIA", note: "from DEN" },
  { pick: 31, team: "NE",  note: "" },
  { pick: 32, team: "SEA", note: "" },
];

// ── Seed Function ──────────────────────────────────
async function seed() {
  console.log("🏈 Seeding Draft Day Challenge database...\n");

  // 1. Insert teams
  console.log("  → Inserting 32 NFL teams...");
  const insertedTeams = await db
    .insert(schema.teams)
    .values(NFL_TEAMS)
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${insertedTeams.length} teams inserted`);

  // Build abbreviation → id lookup
  const teamMap = new Map(
    insertedTeams.map((t) => [t.abbreviation, t.id])
  );

  // 2. Insert admin user (Dan)
  console.log("  → Creating admin user (Dan)...");
  const [dan] = await db
    .insert(schema.users)
    .values({
      name: "Dan",
      email: "dan@slidey.com",
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();
  if (dan) {
    console.log(`    ✓ Admin user created: ${dan.id}`);
  } else {
    console.log("    ⏭ Admin user already exists");
  }

  // 3. Insert 2026 draft order
  console.log("  → Inserting 2026 Round 1 draft order...");
  const draftOrderValues = DRAFT_ORDER_2026.map((pick) => ({
    season: 2026,
    pickNumber: pick.pick,
    teamId: teamMap.get(pick.team)!,
    note: pick.note || null,
  }));

  const insertedPicks = await db
    .insert(schema.draftOrder)
    .values(draftOrderValues)
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${insertedPicks.length} draft picks inserted`);

  console.log("\n🎉 Seed complete!\n");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
