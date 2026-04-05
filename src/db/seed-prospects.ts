import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ── Top 50 Prospects — 2026 NFL Draft ──────────────
const PROSPECTS = [
  { name: "Cam Ward", position: "QB", school: "Miami" },
  { name: "Shedeur Sanders", position: "QB", school: "Colorado" },
  { name: "Travis Hunter", position: "WR/CB", school: "Colorado" },
  { name: "Abdul Carter", position: "EDGE", school: "Penn State" },
  { name: "Tetairoa McMillan", position: "WR", school: "Arizona" },
  { name: "Mason Graham", position: "DT", school: "Michigan" },
  { name: "Will Johnson", position: "CB", school: "Michigan" },
  { name: "Ashton Jeanty", position: "RB", school: "Boise State" },
  { name: "Kelvin Banks Jr.", position: "OT", school: "Texas" },
  { name: "Tyler Warren", position: "TE", school: "Penn State" },
  { name: "Malaki Starks", position: "S", school: "Georgia" },
  { name: "Luther Burden III", position: "WR", school: "Missouri" },
  { name: "James Pearce Jr.", position: "EDGE", school: "Tennessee" },
  { name: "Mykel Williams", position: "EDGE", school: "Georgia" },
  { name: "Jalon Walker", position: "LB", school: "Georgia" },
  { name: "Will Campbell", position: "OT", school: "LSU" },
  { name: "Kenneth Grant", position: "DT", school: "Michigan" },
  { name: "Colston Loveland", position: "TE", school: "Michigan" },
  { name: "Nick Emmanwori", position: "S", school: "South Carolina" },
  { name: "Nic Scourton", position: "EDGE", school: "Texas A&M" },
  { name: "Benjamin Morrison", position: "CB", school: "Notre Dame" },
  { name: "Derrick Harmon", position: "DT", school: "Oregon" },
  { name: "Emeka Egbuka", position: "WR", school: "Ohio State" },
  { name: "Jalen Milroe", position: "QB", school: "Alabama" },
  { name: "Josh Simmons", position: "OT", school: "Ohio State" },
  { name: "Donovan Ezeiruaku", position: "EDGE", school: "Boston College" },
  { name: "Shavon Revel Jr.", position: "CB", school: "East Carolina" },
  { name: "Tre Harris", position: "WR", school: "Ole Miss" },
  { name: "Aireontae Ersery", position: "OT", school: "Minnesota" },
  { name: "Deone Walker", position: "DT", school: "Kentucky" },
  { name: "Grey Zabel", position: "IOL", school: "North Dakota State" },
  { name: "Tyleik Williams", position: "DT", school: "Ohio State" },
  { name: "Isaiah Bond", position: "WR", school: "Texas" },
  { name: "Jihaad Campbell", position: "LB", school: "Alabama" },
  { name: "Landon Jackson", position: "EDGE", school: "Arkansas" },
  { name: "Cameron Williams", position: "OT", school: "Texas" },
  { name: "Omarion Hampton", position: "RB", school: "North Carolina" },
  { name: "Quinshon Judkins", position: "RB", school: "Ohio State" },
  { name: "Shemar Stewart", position: "EDGE", school: "Texas A&M" },
  { name: "Xavier Watts", position: "S", school: "Notre Dame" },
  { name: "Princely Umanmielen", position: "EDGE", school: "Ole Miss" },
  { name: "Harold Fannin Jr.", position: "TE", school: "Bowling Green" },
  { name: "Wyatt Milum", position: "OT", school: "West Virginia" },
  { name: "Trey Amos", position: "CB", school: "Ole Miss" },
  { name: "Jack Sawyer", position: "EDGE", school: "Ohio State" },
  { name: "Tyler Booker", position: "IOL", school: "Alabama" },
  { name: "Darien Porter", position: "WR", school: "Iowa State" },
  { name: "Jaylin Noel", position: "WR", school: "Iowa State" },
  { name: "Shemar Turner", position: "DT", school: "Texas A&M" },
  { name: "Matthew Golden", position: "WR", school: "Texas" },
];

async function seedProspects() {
  console.log("🎓 Seeding 2026 prospect pool...\n");

  const inserted = await db
    .insert(schema.players)
    .values(PROSPECTS)
    .onConflictDoNothing()
    .returning();

  console.log(`  ✓ ${inserted.length} prospects inserted`);
  console.log("\n🎉 Prospects seeded!\n");
}

seedProspects().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
