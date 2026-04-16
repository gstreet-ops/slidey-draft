// Seed 2026 team needs — run with: npx tsx src/db/seed-team-needs-2026.ts

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const TEAM_NEEDS_2026: Record<string, string[]> = {
  CLE: ["QB", "OT", "WR", "EDGE"],
  NYG: ["OT", "EDGE", "QB", "CB"],
  LV: ["QB", "OT", "WR", "DL"],
  NE: ["WR", "OT", "EDGE", "CB"],
  NYJ: ["OT", "EDGE", "CB", "WR"],
  TEN: ["OT", "WR", "EDGE", "DL"],
  CAR: ["OT", "DL", "EDGE", "CB"],
  DAL: ["OT", "DL", "S", "CB"],
  NO: ["QB", "OT", "WR", "CB"],
  CHI: ["OT", "WR", "CB", "DL"],
  SF: ["DL", "OT", "CB", "EDGE"],
  JAX: ["OT", "WR", "EDGE", "DL"],
  MIA: ["OT", "OG", "DL", "LB"],
  IND: ["WR", "OT", "CB", "EDGE"],
  LAR: ["OT", "DL", "EDGE", "LB"],
  ARI: ["EDGE", "CB", "OT", "DL"],
  CIN: ["OT", "DL", "CB", "LB"],
  SEA: ["OT", "EDGE", "DL", "CB"],
  ATL: ["EDGE", "OT", "DL", "S"],
  TB: ["DL", "EDGE", "OT", "CB"],
  PIT: ["OT", "CB", "WR", "DL"],
  LAC: ["OT", "DL", "LB", "WR"],
  GB: ["DL", "EDGE", "S", "OT"],
  MIN: ["OT", "CB", "DL", "EDGE"],
  HOU: ["OT", "EDGE", "CB", "S"],
  BAL: ["OT", "WR", "CB", "DL"],
  DEN: ["OT", "WR", "CB", "DL"],
  BUF: ["OT", "DL", "WR", "CB"],
  DET: ["DL", "CB", "EDGE", "LB"],
  WAS: ["DL", "LB", "OT", "S"],
  KC: ["WR", "OT", "DL", "CB"],
  PHI: ["CB", "LB", "S", "DL"],
};

async function main() {
  for (const [abbr, needs] of Object.entries(TEAM_NEEDS_2026)) {
    await sql.query(
      "UPDATE teams SET needs = $1 WHERE abbreviation = $2",
      [JSON.stringify(needs), abbr]
    );
    console.log(`Updated ${abbr}: ${needs.join(", ")}`);
  }
  console.log("\nDone — all team needs seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
