import { db } from "./index";
import { actualResults, draftOrder, players, scores, draftBoards, picks, pickScores } from "./schema";
import { eq, asc, and, sql, isNotNull, inArray } from "drizzle-orm";
import { ACTUAL_DRAFT_ORDER } from "./seed-simulation";

const SEASON = 2026;

async function main() {
  const slots = await db.select().from(draftOrder)
    .where(eq(draftOrder.season, SEASON)).orderBy(asc(draftOrder.pickNumber));
  const prospects = await db.select({ id: players.id, name: players.name })
    .from(players).where(isNotNull(players.rank)).orderBy(asc(players.rank));

  // Insert pick #1
  const slot = slots[0];
  const player = prospects[ACTUAL_DRAFT_ORDER[0]];
  console.log(`Inserting pick #${slot.pickNumber}: ${player.name}`);

  await db.insert(actualResults).values({
    season: SEASON, pickNumber: slot.pickNumber,
    playerId: player.id, teamId: slot.teamId, announcedAt: new Date(),
  });

  // Score sim boards inline
  const results = await db.select({ pickNumber: actualResults.pickNumber, playerId: actualResults.playerId })
    .from(actualResults).where(eq(actualResults.season, SEASON));

  const actualByPlayer = new Map(results.map(r => [r.playerId, r.pickNumber]));

  const simBoards = await db.select({ id: draftBoards.id, createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(sql`${draftBoards.createdBy} IN (SELECT id FROM users WHERE email LIKE 'sim_%@slidey.test')`);

  console.log(`Scoring ${simBoards.length} sim boards...`);

  for (const board of simBoards) {
    const boardPicks = await db.select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
      .from(picks).where(eq(picks.boardId, board.id));

    let totalScore = 0, correctExact = 0, correctPlayer = 0;
    for (const pick of boardPicks) {
      if (pick.pickNumber !== slot.pickNumber) continue;
      const actual = actualByPlayer.get(pick.playerId);
      if (actual !== undefined) {
        const delta = Math.abs(pick.pickNumber - actual);
        if (delta === 0) { totalScore += 10; correctExact++; }
        else if (delta <= 5) { totalScore += 5; correctPlayer++; }
        else { totalScore += 3; correctPlayer++; }
      }
    }

    const [existing] = await db.select({ id: scores.id }).from(scores).where(eq(scores.boardId, board.id));
    if (existing) {
      await db.update(scores).set({ totalScore, correctExact, correctPlayer, updatedAt: new Date() })
        .where(eq(scores.boardId, board.id));
    } else {
      await db.insert(scores).values({ boardId: board.id, userId: board.createdBy, totalScore, correctExact, correctPlayer, accuracyPct: 100 });
    }

    const title = await db.select({ title: draftBoards.title }).from(draftBoards).where(eq(draftBoards.id, board.id));
    console.log(`  ${title[0].title}: ${totalScore}pts`);
  }

  console.log("Done — pick #1 scored successfully");

  // Now clean up the result we just inserted so the sim page can start fresh
  await db.delete(actualResults).where(eq(actualResults.season, SEASON));
  await db.delete(scores);
  console.log("Cleaned up test result");

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
