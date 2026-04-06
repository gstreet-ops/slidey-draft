import { db } from "@/db";
import { eq, asc, desc, and } from "drizzle-orm";
import {
  teams,
  players,
  draftOrder,
  draftBoards,
  picks,
  users,
  groups,
  groupMembers,
  actualResults,
  scores,
} from "@/db/schema";
import { sql } from "drizzle-orm";

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

// ── User Boards ────────────────────────────────────
export async function getUserBoard(userId: string, season: number) {
  const [board] = await db
    .select()
    .from(draftBoards)
    .where(
      and(
        eq(draftBoards.createdBy, userId),
        eq(draftBoards.season, season),
        eq(draftBoards.type, "mock")
      )
    )
    .orderBy(desc(draftBoards.createdAt))
    .limit(1);
  return board || null;
}

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
}

// ── Groups ─────────────────────────────────────────
export async function getGroupByInviteCode(code: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code));
  return group || null;
}

export async function getGroupById(groupId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId));
  return group || null;
}

export async function getGroupMembers(groupId: string) {
  return db
    .select({
      userId: groupMembers.userId,
      joinedAt: groupMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));
}

export async function getGroupsForUser(userId: string) {
  return db
    .select({
      groupId: groupMembers.groupId,
      groupName: groups.name,
      inviteCode: groups.inviteCode,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));
}

export async function getAllGroups() {
  return db.select().from(groups).orderBy(desc(groups.createdAt));
}

export async function isGroupMember(groupId: string, userId: string) {
  const [row] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    );
  return !!row;
}

// ── Boards by group ────────────────────────────────
export async function getBoardsForGroup(groupId: string, season: number) {
  // Get all user IDs in this group
  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.userId);

  // Get published boards from these users
  const allBoards = await db
    .select({
      id: draftBoards.id,
      title: draftBoards.title,
      season: draftBoards.season,
      status: draftBoards.status,
      createdBy: draftBoards.createdBy,
      publishedAt: draftBoards.publishedAt,
      createdAt: draftBoards.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(draftBoards)
    .innerJoin(users, eq(draftBoards.createdBy, users.id))
    .where(
      and(
        eq(draftBoards.season, season),
        eq(draftBoards.status, "published")
      )
    )
    .orderBy(desc(draftBoards.publishedAt));

  // Filter to group members only
  return allBoards.filter((b) => b.createdBy && memberIds.includes(b.createdBy));
}

// ── Actual Results ─────────────────────────────────
export async function getActualResults(season: number) {
  return db
    .select({
      id: actualResults.id,
      season: actualResults.season,
      pickNumber: actualResults.pickNumber,
      playerId: actualResults.playerId,
      teamId: actualResults.teamId,
      announcedAt: actualResults.announcedAt,
      playerName: players.name,
      playerPosition: players.position,
      playerSchool: players.school,
      teamName: teams.name,
      teamAbbreviation: teams.abbreviation,
      teamPrimaryColor: teams.primaryColor,
    })
    .from(actualResults)
    .innerJoin(players, eq(actualResults.playerId, players.id))
    .innerJoin(teams, eq(actualResults.teamId, teams.id))
    .where(eq(actualResults.season, season))
    .orderBy(asc(actualResults.pickNumber));
}

// ── Leaderboard ────────────────────────────────────
export async function getLeaderboard(season: number) {
  // Get all published boards with their total scores
  const boardScores = await db
    .select({
      boardId: scores.boardId,
      totalPoints: sql<number>`COALESCE(SUM(${scores.pointsAwarded}), 0)`.as("total_points"),
      exactMatches: sql<number>`COALESCE(SUM(CASE WHEN ${scores.exactMatch} THEN 1 ELSE 0 END), 0)`.as("exact_matches"),
      playerCorrects: sql<number>`COALESCE(SUM(CASE WHEN ${scores.playerCorrect} THEN 1 ELSE 0 END), 0)`.as("player_corrects"),
    })
    .from(scores)
    .groupBy(scores.boardId);

  if (boardScores.length === 0) return [];

  // Enrich with board + user info
  const enriched = await Promise.all(
    boardScores.map(async (bs) => {
      const [board] = await db
        .select({
          id: draftBoards.id,
          title: draftBoards.title,
          createdBy: draftBoards.createdBy,
          season: draftBoards.season,
          status: draftBoards.status,
        })
        .from(draftBoards)
        .where(eq(draftBoards.id, bs.boardId));

      if (!board || board.season !== season || board.status !== "published") return null;

      let user = null;
      if (board.createdBy) {
        const [u] = await db
          .select({ name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, board.createdBy));
        user = u || null;
      }

      return {
        boardId: bs.boardId,
        boardTitle: board.title,
        totalPoints: Number(bs.totalPoints),
        exactMatches: Number(bs.exactMatches),
        playerCorrects: Number(bs.playerCorrects),
        userName: user?.name || user?.email || "Anonymous",
        userRole: user?.role || "user",
      };
    })
  );

  return enriched
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
