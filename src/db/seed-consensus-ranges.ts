// Seed/update consensus ranges for all players
// Run with: npx tsx src/db/seed-consensus-ranges.ts

import { neon } from "@neondatabase/serverless";
import { computeAllRanges } from "../lib/consensus-range";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
const sql = neon(DATABASE_URL);

async function main() {
  // Fetch all ranked players
  const players = await sql.query(
    "SELECT id, rank, grade, position FROM players WHERE rank IS NOT NULL ORDER BY rank"
  );
  console.log(`Found ${players.length} ranked players`);

  // Fetch all picks from published boards
  const mockPicks = await sql.query(
    `SELECT p.player_id, p.pick_number FROM picks p
     INNER JOIN draft_boards b ON p.board_id = b.id
     WHERE b.status = 'published'`
  );
  console.log(`Found ${mockPicks.length} mock picks from published boards`);

  const playerInputs = players.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    rank: p.rank as number | null,
    grade: p.grade as number | null,
    position: p.position as string,
  }));

  const pickInputs = mockPicks.map((p: Record<string, unknown>) => ({
    playerId: p.player_id as string,
    pickNumber: p.pick_number as number,
  }));

  const ranges = computeAllRanges(playerInputs, pickInputs);
  console.log(`Computed ranges for ${ranges.size} players`);

  let updated = 0;
  for (const [playerId, range] of ranges) {
    await sql.query(
      "UPDATE players SET consensus_low = $1, consensus_high = $2, consensus_mid = $3 WHERE id = $4",
      [range.low, range.high, range.mid, playerId]
    );
    updated++;
  }
  console.log(`Updated ${updated} players with consensus ranges.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
