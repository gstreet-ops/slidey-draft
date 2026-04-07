import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { bpaRankings, picks, players, draftBoards, draftOrder } from "@/db/schema";
import { fetchDraftAthletes, normalizePlayerName, positionMatches } from "@/lib/espn-api";

/**
 * Fetch ESPN BPA rankings and store in bpa_rankings table.
 * Matches ESPN athletes to our players table by normalized name + position.
 */
export async function fetchAndStoreBpaRankings(season: number): Promise<number> {
  const athletes = await fetchDraftAthletes(season);
  if (athletes.length === 0) return 0;

  const ourPlayers = await db.select().from(players);

  // Clear existing rankings
  await db.delete(bpaRankings);

  let matched = 0;
  for (const athlete of athletes) {
    const player = ourPlayers.find(p =>
      normalizePlayerName(p.name) === normalizePlayerName(athlete.fullName) &&
      positionMatches(athlete.position, p.position)
    );

    if (player) {
      await db.insert(bpaRankings).values({
        playerId: player.id,
        espnAthleteId: athlete.id,
        rank: athlete.rank,
      });
      matched++;
    } else {
      console.warn(
        `[BPA] No match for ESPN athlete: ${athlete.fullName} (${athlete.position}, ${athlete.school})`
      );
    }
  }

  return matched;
}

/**
 * Auto-fill empty slots on a board with Best Player Available.
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
    .select({ playerId: bpaRankings.playerId, rank: bpaRankings.rank })
    .from(bpaRankings)
    .orderBy(asc(bpaRankings.rank));

  if (rankings.length === 0) return 0;

  let filled = 0;

  for (let pickNumber = 1; pickNumber <= 32; pickNumber++) {
    if (pickedNumbers.has(pickNumber)) continue;

    const teamId = teamByPick.get(pickNumber);
    if (!teamId) continue;

    const bpaPlayer = rankings.find((r) => !pickedPlayerIds.has(r.playerId));
    if (!bpaPlayer) break;

    await db.insert(picks).values({
      boardId,
      pickNumber,
      playerId: bpaPlayer.playerId,
      teamId,
      autoFilled: true,
    });

    pickedPlayerIds.add(bpaPlayer.playerId);
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
