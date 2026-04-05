import { db } from "@/db";
import { eq, asc, desc } from "drizzle-orm";
import {
  teams,
  players,
  draftOrder,
  draftBoards,
  picks,
} from "@/db/schema";

// ── Teams ──────────────────────────────────────────
export async function getTeams() {
  return db.select().from(teams).orderBy(asc(teams.name));
}

export async function getTeamById(id: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  return team;
}

// ── Players (prospects) ────────────────────────────
export async function getPlayers() {
  return db.select().from(players).orderBy(asc(players.name));
}

// ── Draft Order ────────────────────────────────────
export async function getDraftOrder(season: number) {
  return db
    .select({
      id: draftOrder.id,
      season: draftOrder.season,
      pickNumber: draftOrder.pickNumber,
      teamId: draftOrder.teamId,
      note: draftOrder.note,
      teamName: teams.name,
      teamAbbreviation: teams.abbreviation,
      teamPrimaryColor: teams.primaryColor,
    })
    .from(draftOrder)
    .innerJoin(teams, eq(draftOrder.teamId, teams.id))
    .where(eq(draftOrder.season, season))
    .orderBy(asc(draftOrder.pickNumber));
}

// ── Draft Boards ───────────────────────────────────
export async function getBoards(season: number) {
  return db
    .select()
    .from(draftBoards)
    .where(eq(draftBoards.season, season))
    .orderBy(desc(draftBoards.createdAt));
}

export async function getBoardWithPicks(boardId: string) {
  const [board] = await db
    .select()
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));

  if (!board) return null;

  const boardPicks = await db
    .select({
      id: picks.id,
      pickNumber: picks.pickNumber,
      playerId: picks.playerId,
      teamId: picks.teamId,
      analysis: picks.analysis,
      confidence: picks.confidence,
      playerName: players.name,
      playerPosition: players.position,
      playerSchool: players.school,
      teamName: teams.name,
      teamAbbreviation: teams.abbreviation,
      teamPrimaryColor: teams.primaryColor,
    })
    .from(picks)
    .innerJoin(players, eq(picks.playerId, players.id))
    .innerJoin(teams, eq(picks.teamId, teams.id))
    .where(eq(picks.boardId, boardId))
    .orderBy(asc(picks.pickNumber));

  return { board, picks: boardPicks };
}
