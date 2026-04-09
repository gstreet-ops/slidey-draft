import { db } from "./index";
import { users, teams } from "./schema";
import { eq, sql } from "drizzle-orm";

// Assign favorite teams to sim users (and brian if not set)
const ASSIGNMENTS: Record<string, string> = {
  "sim_alice@slidey.test": "DET",   // Lions
  "sim_bob@slidey.test": "DAL",     // Cowboys
  "sim_charlie@slidey.test": "SF",  // 49ers
  "sim_diana@slidey.test": "MIA",   // Dolphins
};

async function main() {
  const allTeams = await db.select({ id: teams.id, abbreviation: teams.abbreviation }).from(teams);
  const teamByAbbr = new Map(allTeams.map(t => [t.abbreviation, t.id]));

  for (const [email, abbr] of Object.entries(ASSIGNMENTS)) {
    const teamId = teamByAbbr.get(abbr);
    if (!teamId) { console.log(`  SKIP ${email} — team ${abbr} not found`); continue; }
    const result = await db.update(users).set({ favoriteTeamId: teamId }).where(eq(users.email, email)).returning({ id: users.id });
    if (result.length) console.log(`  ${email} → ${abbr}`);
    else console.log(`  SKIP ${email} — user not found`);
  }

  // Brian → Lions if not already set
  const [brian] = await db.select({ id: users.id, favoriteTeamId: users.favoriteTeamId }).from(users)
    .where(eq(users.email, "brian@globestreet.com"));
  if (brian && !brian.favoriteTeamId) {
    const detId = teamByAbbr.get("DET");
    if (detId) {
      await db.update(users).set({ favoriteTeamId: detId }).where(eq(users.id, brian.id));
      console.log("  brian@globestreet.com → DET");
    }
  } else if (brian) {
    console.log("  brian@globestreet.com — already has team set");
  }

  console.log("Done");
  process.exit(0);
}
main();
