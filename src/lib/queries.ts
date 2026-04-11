import { db } from "@/db";
import { eq, asc, desc, and, gt } from "drizzle-orm";
import {
  teams,
  players,
  draftOrder,
  draftBoards,
  picks,
  users,
  actualResults,
  scores,
  pickScores,
  pools,
  poolMembers,
  poolAnnouncements,
  poolStandings,
  appInvites,
  livePredictions,
  chatMessages,
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
  return db
    .select()
    .from(players)
    .orderBy(sql`${players.rank} ASC NULLS LAST`, asc(players.name));
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
      teamLogoUrl: teams.logoUrl,
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
      playerImageUrl: players.imageUrl,
      playerNotes: players.notes,
      playerHeight: players.height,
      playerWeight: players.weight,
      playerRank: players.rank,
      playerGrade: players.grade,
      playerPositionRank: players.positionRank,
      playerFortyTime: players.fortyTime,
      playerVertical: players.vertical,
      playerBenchPress: players.benchPress,
      playerBroadJump: players.broadJump,
      playerThreeConeDrill: players.threeConeDrill,
      playerShuttle: players.shuttle,
      playerNflComparison: players.nflComparison,
      playerSchoolLogoUrl: players.schoolLogoUrl,
      teamName: teams.name,
      teamAbbreviation: teams.abbreviation,
      teamPrimaryColor: teams.primaryColor,
      teamLogoUrl: teams.logoUrl,
      autoFilled: picks.autoFilled,
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

// ── Groups (REMOVED — migrated to Pools) ──────────

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

// ── Leaderboard (new scores table) ────────────────
export async function getLeaderboard(season: number, groupMemberIds?: string[]) {
  const rows = await db
    .select({
      boardId: scores.boardId,
      totalScore: scores.totalScore,
      correctExact: scores.correctExact,
      correctPlayer: scores.correctPlayer,
      accuracyPct: scores.accuracyPct,
      previousRank: scores.previousRank,
      boardTitle: draftBoards.title,
      boardStatus: draftBoards.status,
      boardSeason: draftBoards.season,
      createdBy: draftBoards.createdBy,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      userId: users.id,
      teamLogoUrl: teams.logoUrl,
      teamPrimaryColor: teams.primaryColor,
      teamAbbreviation: teams.abbreviation,
      teamName: teams.name,
    })
    .from(scores)
    .innerJoin(draftBoards, eq(scores.boardId, draftBoards.id))
    .leftJoin(users, eq(scores.userId, users.id))
    .leftJoin(teams, eq(users.favoriteTeamId, teams.id))
    .where(eq(draftBoards.season, season))
    .orderBy(desc(scores.totalScore));

  let filtered = rows.filter(
    (r) => r.boardStatus === "published" || r.boardStatus === "locked"
  );

  if (groupMemberIds) {
    filtered = filtered.filter(
      (r) => r.createdBy && groupMemberIds.includes(r.createdBy)
    );
  }

  return filtered.map((r, index) => ({
    boardId: r.boardId,
    boardTitle: r.boardTitle,
    totalScore: r.totalScore,
    correctExact: r.correctExact,
    correctPlayer: r.correctPlayer,
    accuracyPct: r.accuracyPct,
    previousRank: r.previousRank,
    currentRank: index + 1,
    userName: r.userName || r.userEmail || "Anonymous",
    userRole: r.userRole || "user",
    userId: r.userId,
    teamLogoUrl: r.teamLogoUrl,
    teamPrimaryColor: r.teamPrimaryColor,
    teamAbbreviation: r.teamAbbreviation,
    teamName: r.teamName,
  }));
}

// ═══════════════════════════════════════════════════
// PHASE 3: Pools & Live Predictions
// ═══════════════════════════════════════════════════

// ── Pools ─────────────────────────────────────────
export async function getPoolById(poolId: string) {
  const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
  return pool || null;
}

export async function getAllPools() {
  return db.select().from(pools).orderBy(desc(pools.createdAt));
}

export async function getPoolByInviteCode(code: string) {
  const [result] = await db
    .select({
      id: pools.id,
      name: pools.name,
      commissionerId: pools.commissionerId,
      inviteCode: pools.inviteCode,
      status: pools.status,
      settings: pools.settings,
      description: pools.description,
      logoUrl: pools.logoUrl,
      primaryColor: pools.primaryColor,
      secondaryColor: pools.secondaryColor,
      createdAt: pools.createdAt,
      updatedAt: pools.updatedAt,
      commissionerName: users.name,
    })
    .from(pools)
    .leftJoin(users, eq(pools.commissionerId, users.id))
    .where(eq(pools.inviteCode, code.toUpperCase().trim()));
  return result || null;
}

export async function getPoolsForUser(userId: string) {
  return db
    .select({
      poolId: poolMembers.poolId,
      role: poolMembers.role,
      joinedAt: poolMembers.joinedAt,
      poolName: pools.name,
      poolStatus: pools.status,
      inviteCode: pools.inviteCode,
      description: pools.description,
      settings: pools.settings,
    })
    .from(poolMembers)
    .innerJoin(pools, eq(poolMembers.poolId, pools.id))
    .where(eq(poolMembers.userId, userId))
    .orderBy(desc(pools.createdAt));
}

export async function getPoolMembers(poolId: string) {
  return db
    .select({
      id: poolMembers.id,
      userId: poolMembers.userId,
      role: poolMembers.role,
      joinedAt: poolMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(poolMembers)
    .innerJoin(users, eq(poolMembers.userId, users.id))
    .where(eq(poolMembers.poolId, poolId))
    .orderBy(asc(poolMembers.joinedAt));
}

export async function getPoolMemberCount(poolId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));
  return rows[0]?.count ?? 0;
}

export async function isPoolMember(poolId: string, userId: string) {
  const [row] = await db
    .select()
    .from(poolMembers)
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );
  return !!row;
}

// ── Pool Announcements ────────────────────────────
export async function getPoolAnnouncements(poolId: string) {
  return db
    .select({
      id: poolAnnouncements.id,
      content: poolAnnouncements.content,
      pinned: poolAnnouncements.pinned,
      createdAt: poolAnnouncements.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(poolAnnouncements)
    .innerJoin(users, eq(poolAnnouncements.authorId, users.id))
    .where(eq(poolAnnouncements.poolId, poolId))
    .orderBy(desc(poolAnnouncements.pinned), desc(poolAnnouncements.createdAt));
}

// ── Pool Standings ────────────────────────────────
export async function getPoolStandings(poolId: string) {
  return db
    .select({
      userId: poolStandings.userId,
      mockBonus: poolStandings.mockBonus,
      liveTotal: poolStandings.liveTotal,
      triviaTotal: poolStandings.triviaTotal,
      combinedScore: poolStandings.combinedScore,
      rank: poolStandings.rank,
      previousRank: poolStandings.previousRank,
      picksPredicted: poolStandings.picksPredicted,
      correctPredictions: poolStandings.correctPredictions,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      teamLogoUrl: teams.logoUrl,
      teamPrimaryColor: teams.primaryColor,
      teamAbbreviation: teams.abbreviation,
    })
    .from(poolStandings)
    .innerJoin(users, eq(poolStandings.userId, users.id))
    .leftJoin(teams, eq(users.favoriteTeamId, teams.id))
    .where(eq(poolStandings.poolId, poolId))
    .orderBy(asc(poolStandings.rank));
}

// ── Live Predictions ──────────────────────────────
export async function getUserPrediction(
  poolId: string,
  userId: string,
  pickNumber: number
) {
  const [pred] = await db
    .select({
      id: livePredictions.id,
      predictedPlayerId: livePredictions.predictedPlayerId,
      submittedAt: livePredictions.submittedAt,
      playerName: players.name,
      playerPosition: players.position,
      playerSchool: players.school,
    })
    .from(livePredictions)
    .innerJoin(players, eq(livePredictions.predictedPlayerId, players.id))
    .where(
      and(
        eq(livePredictions.poolId, poolId),
        eq(livePredictions.userId, userId),
        eq(livePredictions.pickNumber, pickNumber)
      )
    );
  return pred || null;
}

export async function getAllPredictionsForPick(poolId: string, pickNumber: number) {
  return db
    .select({
      userId: livePredictions.userId,
      predictedPlayerId: livePredictions.predictedPlayerId,
      submittedAt: livePredictions.submittedAt,
      playerName: players.name,
      playerPosition: players.position,
      userName: users.name,
      userEmail: users.email,
    })
    .from(livePredictions)
    .innerJoin(players, eq(livePredictions.predictedPlayerId, players.id))
    .innerJoin(users, eq(livePredictions.userId, users.id))
    .where(
      and(
        eq(livePredictions.poolId, poolId),
        eq(livePredictions.pickNumber, pickNumber)
      )
    );
}

// ── App Invites ───────────────────────────────────
export async function getAllAppInvites() {
  return db
    .select({
      id: appInvites.id,
      code: appInvites.code,
      createdAt: appInvites.createdAt,
      claimedAt: appInvites.claimedAt,
      creatorName: sql<string>`creator.name`,
      creatorEmail: sql<string>`creator.email`,
      claimerName: sql<string>`claimer.name`,
      claimerEmail: sql<string>`claimer.email`,
    })
    .from(appInvites)
    .leftJoin(sql`users as creator`, sql`creator.id = ${appInvites.createdBy}`)
    .leftJoin(sql`users as claimer`, sql`claimer.id = ${appInvites.claimedBy}`)
    .orderBy(desc(appInvites.createdAt));
}

// ── Pick Scores for a board ───────────────────────
export async function getPickScoresForBoard(boardId: string) {
  return db
    .select({
      pickNumber: pickScores.pickNumber,
      pointsAwarded: pickScores.pointsAwarded,
      matchType: pickScores.matchType,
      actualPlayerId: pickScores.actualPlayerId,
      actualPlayerName: players.name,
      actualPlayerPosition: players.position,
      actualPlayerSchool: players.school,
    })
    .from(pickScores)
    .leftJoin(players, eq(pickScores.actualPlayerId, players.id))
    .where(eq(pickScores.boardId, boardId))
    .orderBy(asc(pickScores.pickNumber));
}

export async function getPoolChatMessages(poolId: string, after?: string) {
  const conditions = [eq(chatMessages.poolId, poolId)];
  if (after) {
    conditions.push(gt(chatMessages.createdAt, new Date(after)));
  }

  const messages = await db
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      userId: chatMessages.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .where(and(...conditions))
    .orderBy(chatMessages.createdAt)
    .limit(50);

  return messages;
}
