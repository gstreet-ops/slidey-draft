import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
const sql = neon(DATABASE_URL);

const DEFAULT_PROPS = [
  { question: 'First RB taken in Round 1', type: 'pick_player', category: 'position', points: 10, sortOrder: 1 },
  { question: 'First WR taken in Round 1', type: 'pick_player', category: 'position', points: 10, sortOrder: 2 },
  { question: 'First defensive player selected', type: 'pick_player', category: 'position', points: 10, sortOrder: 3 },
  { question: 'First QB off the board', type: 'pick_player', category: 'position', points: 5, sortOrder: 4 },
  { question: 'QBs taken in Round 1', type: 'over_under', options: { line: 3.5 }, category: 'position', points: 5, sortOrder: 5 },
  { question: 'WRs taken in Round 1', type: 'over_under', options: { line: 5.5 }, category: 'position', points: 5, sortOrder: 6 },
  { question: 'Offensive linemen taken in the top 15', type: 'over_under', options: { line: 4.5 }, category: 'position', points: 5, sortOrder: 7 },
  { question: 'Total trades in Round 1', type: 'over_under', options: { line: 2.5 }, category: 'trade', points: 5, sortOrder: 8 },
  { question: 'Will a WR go in the top 3 picks?', type: 'yes_no', category: 'position', points: 5, sortOrder: 9 },
  { question: 'Will any team trade up into the top 5?', type: 'yes_no', category: 'trade', points: 5, sortOrder: 10 },
  { question: 'Will back-to-back picks be the same position?', type: 'yes_no', category: 'fun', points: 5, sortOrder: 11 },
  { question: 'Will a player from Pittsburgh be drafted in Round 1?', type: 'yes_no', category: 'fun', points: 5, sortOrder: 12 },
  { question: 'What pick will the first trade-up happen?', type: 'pick_number', category: 'trade', points: 10, sortOrder: 13 },
  { question: 'At what pick will the first SEC player NOT be selected?', type: 'pick_number', category: 'fun', points: 5, sortOrder: 14 },
];

async function main() {
  for (const p of DEFAULT_PROPS) {
    await sql.query(
      `INSERT INTO props (question, type, options, category, points, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [p.question, p.type, p.options ? JSON.stringify(p.options) : null, p.category, p.points, p.sortOrder]
    );
    console.log(`Seeded: ${p.question}`);
  }
  console.log('\nDone — props seeded.');
}

main().catch(e => { console.error(e); process.exit(1); });
