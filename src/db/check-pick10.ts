import { db } from "./index";
import { draftOrder, teams, players, picks, draftBoards } from "./schema";
import { eq, asc, isNotNull, and } from "drizzle-orm";

async function main() {
  // What team is at pick 10?
  const [slot] = await db.select({ teamId: draftOrder.teamId, teamName: teams.name, abbr: teams.abbreviation })
    .from(draftOrder).innerJoin(teams, eq(draftOrder.teamId, teams.id))
    .where(and(eq(draftOrder.season, 2026), eq(draftOrder.pickNumber, 10)));
  console.log("Pick #10:", slot);

  // What players are already picked on brian's board?
  const [board] = await db.select({ id: draftBoards.id }).from(draftBoards)
    .where(eq(draftBoards.createdBy, "e3934382-90ef-4892-b5dd-91a5f5d3ea82"));
  const pickedIds = (await db.select({ playerId: picks.playerId }).from(picks).where(eq(picks.boardId, board.id)))
    .map(p => p.playerId);

  // Next best available by rank
  const available = await db.select({ id: players.id, name: players.name, position: players.position, rank: players.rank })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));
  const next = available.filter(p => !pickedIds.includes(p.id));
  console.log("\nTop 5 available:");
  for (const p of next.slice(0, 5)) {
    console.log(`  #${p.rank} ${p.name} (${p.position})`);
  }
  process.exit(0);
}
main();
