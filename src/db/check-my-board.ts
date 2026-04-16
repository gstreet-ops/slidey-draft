import { db } from "./index";
import { draftBoards, picks, players, teams } from "./schema";
import { eq, asc } from "drizzle-orm";

async function main() {
  const boards = await db.select().from(draftBoards)
    .where(eq(draftBoards.createdBy, "e3934382-90ef-4892-b5dd-91a5f5d3ea82"));

  for (const board of boards) {
    console.log(`\nBoard: ${board.title} (${board.status})`);
    const boardPicks = await db
      .select({
        pickNumber: picks.pickNumber,
        playerName: players.name,
        playerPosition: players.position,
        teamAbbr: teams.abbreviation,
        autoFilled: picks.autoFilled,
      })
      .from(picks)
      .innerJoin(players, eq(picks.playerId, players.id))
      .innerJoin(teams, eq(picks.teamId, teams.id))
      .where(eq(picks.boardId, board.id))
      .orderBy(asc(picks.pickNumber));

    console.log(`Picks: ${boardPicks.length}/32`);
    for (const p of boardPicks) {
      console.log(`  #${String(p.pickNumber).padStart(2)} ${p.teamAbbr.padEnd(4)} ${p.playerName.padEnd(25)} ${p.playerPosition}${p.autoFilled ? " (BPA)" : ""}`);
    }

    if (boardPicks.length < 32) {
      const filled = new Set(boardPicks.map(p => p.pickNumber));
      const missing = [];
      for (let i = 1; i <= 32; i++) {
        if (!filled.has(i)) missing.push(i);
      }
      console.log(`\nMissing picks: ${missing.join(", ")}`);
    }
  }
  process.exit(0);
}
main();
