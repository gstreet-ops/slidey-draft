import { db } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { draftBoards, picks, scores } from "@/db/schema";

/**
 * Score ALL published boards against a single actual result.
 *
 * Scoring rules:
 *   exact_match  — predicted correct player at correct pick number → 10 pts
 *   within 3     — player predicted somewhere within ±3 picks      →  5 pts
 *   farther      — player predicted but more than 3 picks away     →  2 pts
 *   not predicted — player not on the board at all                 →  0 pts
 */
export async function scoreAllBoards(
  season: number,
  actualPickNumber: number,
  actualPlayerId: string,
  actualTeamId: string
) {
  // Get all published boards for this season
  const boards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(
      and(
        eq(draftBoards.season, season),
        eq(draftBoards.status, "published")
      )
    );

  for (const board of boards) {
    await scoreBoardForPick(
      board.id,
      actualPickNumber,
      actualPlayerId,
      actualTeamId
    );
  }
}

async function scoreBoardForPick(
  boardId: string,
  actualPickNumber: number,
  actualPlayerId: string,
  actualTeamId: string
) {
  // Get all picks for this board
  const boardPicks = await db
    .select({
      pickNumber: picks.pickNumber,
      playerId: picks.playerId,
      teamId: picks.teamId,
    })
    .from(picks)
    .where(eq(picks.boardId, boardId))
    .orderBy(asc(picks.pickNumber));

  // Find if this player was predicted anywhere on the board
  const predictedPick = boardPicks.find((p) => p.playerId === actualPlayerId);

  let exactMatch = false;
  let playerCorrect = false;
  let teamCorrect = false;
  let slotDelta: number | null = null;
  let pointsAwarded = 0;

  if (predictedPick) {
    playerCorrect = true;
    slotDelta = Math.abs(predictedPick.pickNumber - actualPickNumber);

    if (predictedPick.pickNumber === actualPickNumber) {
      // Exact match: correct player at correct slot
      exactMatch = true;
      pointsAwarded = 10;
    } else if (slotDelta <= 3) {
      // Within 3 picks
      pointsAwarded = 5;
    } else {
      // Farther away
      pointsAwarded = 2;
    }
  }

  // Check if the team at this pick number was predicted correctly
  const pickAtSlot = boardPicks.find((p) => p.pickNumber === actualPickNumber);
  if (pickAtSlot && pickAtSlot.teamId === actualTeamId) {
    teamCorrect = true;
  }

  // Delete any existing score for this board+pick combo, then insert
  await db
    .delete(scores)
    .where(
      and(
        eq(scores.boardId, boardId),
        eq(scores.pickNumber, actualPickNumber)
      )
    );

  await db.insert(scores).values({
    boardId,
    pickNumber: actualPickNumber,
    exactMatch,
    playerCorrect,
    teamCorrect,
    positionCorrect: false, // could be extended later
    slotDelta,
    pointsAwarded,
  });
}
