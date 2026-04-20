import { db } from "@/db";
import { eq, asc, isNotNull } from "drizzle-orm";
import { picks, players, draftBoards, draftOrder } from "@/db/schema";

/**
 * Auto-fill empty slots on a board with Best Player Available, ordered by
 * `players.rank` (the admin-maintained ESPN-synced ranking).
 */
export async function autoFillBPA(boardId: string): Promise<number> {
  const existingPicks = await db
    .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.boardId, boardId));

  const pickedNumbers = new Set(existingPicks.map((p) => p.pickNumber));
  const pickedPlayerIds = new Set(existingPicks.map((p) => p.playerId));

  const [board] = await db
    .select()
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) return 0;

  const order = await db
    .select({ pickNumber: draftOrder.pickNumber, teamId: draftOrder.teamId })
    .from(draftOrder)
    .where(eq(draftOrder.season, board.season))
    .orderBy(asc(draftOrder.pickNumber));

  const teamByPick = new Map(order.map((o) => [o.pickNumber, o.teamId]));

  const rankings = await db
    .select({ id: players.id, rank: players.rank })
    .from(players)
    .where(isNotNull(players.rank))
    .orderBy(asc(players.rank));

  if (rankings.length === 0) return 0;

  let filled = 0;
  const maxPick = order.length > 0 ? Math.max(...order.map((o) => o.pickNumber)) : 32;

  for (let pickNumber = 1; pickNumber <= maxPick; pickNumber++) {
    if (pickedNumbers.has(pickNumber)) continue;

    const teamId = teamByPick.get(pickNumber);
    if (!teamId) continue;

    const bpaPlayer = rankings.find((r) => !pickedPlayerIds.has(r.id));
    if (!bpaPlayer) break;

    await db.insert(picks).values({
      boardId,
      pickNumber,
      playerId: bpaPlayer.id,
      teamId,
      autoFilled: true,
    });

    pickedPlayerIds.add(bpaPlayer.id);
    filled++;
  }

  return filled;
}

/**
 * Auto-fill all boards for a season.
 */
export async function autoFillAllBoards(season: number): Promise<number> {
  const boards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(eq(draftBoards.season, season));

  let totalFilled = 0;
  for (const board of boards) {
    totalFilled += await autoFillBPA(board.id);
  }
  return totalFilled;
}
