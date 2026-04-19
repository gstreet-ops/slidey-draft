import { and, eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  draftBoards,
  picks,
  players,
  teams,
  poolMembers,
  users,
} from "@/db/schema";
import { gradeMockDraft, gradePick } from "@/lib/mock-grading";
import { generatePickCommentary, gradeColorHex } from "@/lib/pick-commentary";
import type { ComparePick, MemberDraft } from "@/components/pool-drafts-list";

/** Fetches every pool member's entry-draft board, enriches with per-pick AI
 *  commentary, grade, position breakdown, and comparison-to-viewer stats.
 *  Shared between the home-page summary (pre-removal) and /mock-drafts.
 *
 *  Batched 3-query pipeline: members → entry boards by inArray → picks by
 *  inArray. Replaces the old N+1 fan-out (42+ queries for a 7-member pool). */
export async function getPoolMemberDrafts(
  poolId: string,
  season: number,
  viewerUserId: string
): Promise<{ memberDrafts: MemberDraft[]; myPickByNumberMap: Record<number, ComparePick> }> {
  // Q1: all members + user info + favorite team, one query.
  const members = await db
    .select({
      userId: poolMembers.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      teamAbbreviation: teams.abbreviation,
      teamName: teams.name,
      teamPrimaryColor: teams.primaryColor,
    })
    .from(poolMembers)
    .innerJoin(users, eq(poolMembers.userId, users.id))
    .leftJoin(teams, eq(users.favoriteTeamId, teams.id))
    .where(eq(poolMembers.poolId, poolId))
    .orderBy(asc(poolMembers.joinedAt));

  const memberIds = members.map((m) => m.userId);

  // Q2: every member's entry board, one query via inArray.
  const memberBoards = memberIds.length
    ? await db
        .select({
          id: draftBoards.id,
          title: draftBoards.title,
          status: draftBoards.status,
          createdBy: draftBoards.createdBy,
        })
        .from(draftBoards)
        .where(
          and(
            inArray(draftBoards.createdBy, memberIds),
            eq(draftBoards.season, season),
            eq(draftBoards.isEntryDraft, true)
          )
        )
    : [];

  const boardByUserId = new Map(memberBoards.map((b) => [b.createdBy!, b]));
  const boardIds = memberBoards.map((b) => b.id);

  // Q3: every pick across every member board, one query via inArray.
  const allBoardPicks = boardIds.length
    ? await db
        .select({
          boardId: picks.boardId,
          pickNumber: picks.pickNumber,
          playerId: picks.playerId,
          analysis: picks.analysis,
          playerName: players.name,
          playerPosition: players.position,
          playerSchool: players.school,
          playerRank: players.rank,
          playerGrade: players.grade,
          playerPositionRank: players.positionRank,
          playerNflComparison: players.nflComparison,
          teamName: teams.name,
          teamAbbreviation: teams.abbreviation,
          teamLogoUrl: teams.logoUrl,
          teamPrimaryColor: teams.primaryColor,
        })
        .from(picks)
        .innerJoin(players, eq(picks.playerId, players.id))
        .innerJoin(teams, eq(picks.teamId, teams.id))
        .where(inArray(picks.boardId, boardIds))
        .orderBy(asc(picks.pickNumber))
    : [];

  const picksByBoardId = new Map<string, typeof allBoardPicks>();
  for (const p of allBoardPicks) {
    const list = picksByBoardId.get(p.boardId) ?? [];
    list.push(p);
    picksByBoardId.set(p.boardId, list);
  }

  type RawDraft = {
    userId: string;
    userName: string;
    userImage: string | null;
    teamAbbreviation: string | null;
    teamName: string | null;
    teamPrimaryColor: string | null;
    boardId: string | null;
    boardTitle: string | null;
    boardStatus: string | null;
    picks: ComparePick[];
  };

  const rawDrafts: RawDraft[] = [];
  for (const m of members) {
    const base = {
      userId: m.userId,
      userName: m.userName || m.userEmail,
      userImage: m.userImage,
      teamAbbreviation: m.teamAbbreviation,
      teamName: m.teamName,
      teamPrimaryColor: m.teamPrimaryColor,
    };

    const board = boardByUserId.get(m.userId);
    if (!board) {
      rawDrafts.push({
        ...base,
        boardId: null,
        boardTitle: null,
        boardStatus: null,
        picks: [],
      });
      continue;
    }

    const allPicks = picksByBoardId.get(board.id) ?? [];
    const ownerIsMe = m.userId === viewerUserId;

    const enrichedPicks: ComparePick[] = allPicks.map((p) => {
      const pg = gradePick(p.pickNumber, p.playerGrade, p.playerRank);
      const boardCtx = {
        picksSoFar: allPicks
          .filter((ep) => ep.pickNumber < p.pickNumber)
          .map((ep) => ({ position: ep.playerPosition, pickNumber: ep.pickNumber })),
        totalPicks: allPicks.filter((ep) => ep.pickNumber <= p.pickNumber).length,
      };
      const commentary = generatePickCommentary(
        {
          pickNumber: p.pickNumber,
          playerName: p.playerName,
          playerPosition: p.playerPosition,
          playerGrade: p.playerGrade,
          playerRank: p.playerRank,
          playerPositionRank: p.playerPositionRank ?? null,
          playerNflComparison: p.playerNflComparison ?? null,
          teamName: p.teamName,
          teamAbbreviation: p.teamAbbreviation,
        },
        pg,
        boardCtx
      );
      return {
        pickNumber: p.pickNumber,
        playerId: p.playerId,
        playerName: p.playerName,
        playerPosition: p.playerPosition,
        playerSchool: p.playerSchool,
        playerRank: p.playerRank,
        playerGrade: p.playerGrade,
        teamAbbreviation: p.teamAbbreviation,
        teamName: p.teamName,
        teamLogoUrl: p.teamLogoUrl,
        teamPrimaryColor: p.teamPrimaryColor,
        commentary,
        gradeLetter: pg.letterGrade,
        gradeColor: gradeColorHex(pg.letterGrade),
        analysisNote: ownerIsMe ? p.analysis : null,
      };
    });

    rawDrafts.push({
      ...base,
      boardId: board.id,
      boardTitle: board.title,
      boardStatus: board.status,
      picks: enrichedPicks,
    });
  }

  const me = rawDrafts.find((d) => d.userId === viewerUserId);
  const myPicks = me?.picks ?? [];
  const myPlayerIds = new Set(myPicks.map((p) => p.playerId));
  const myPickByNumber = new Map(myPicks.map((p) => [p.pickNumber, p]));
  const myPickByNumberMap = Object.fromEntries(myPickByNumber);

  const slotPlayerCount = new Map<string, number>();
  for (const d of rawDrafts) {
    for (const p of d.picks) {
      const key = `${p.pickNumber}:${p.playerId}`;
      slotPlayerCount.set(key, (slotPlayerCount.get(key) ?? 0) + 1);
    }
  }

  const memberDrafts: MemberDraft[] = rawDrafts.map((d) => {
    const overlapPlayerIds = new Set(
      d.picks.filter((p) => myPlayerIds.has(p.playerId)).map((p) => p.playerId)
    );
    const exactSlotMatches = d.picks.filter((p) => {
      const mine = myPickByNumber.get(p.pickNumber);
      return !!mine && mine.playerId === p.playerId;
    }).length;

    const grade =
      d.picks.length > 0
        ? gradeMockDraft(
            d.picks.map((p) => ({
              pickNumber: p.pickNumber,
              playerGrade: p.playerGrade,
              playerRank: p.playerRank,
            }))
          )
        : null;

    const posMap = new Map<string, number>();
    for (const p of d.picks) {
      posMap.set(p.playerPosition, (posMap.get(p.playerPosition) ?? 0) + 1);
    }
    const positionBreakdown = Array.from(posMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([position, count]) => ({ position, count }));

    let mostPopular: { pickNumber: number; playerName: string; otherCount: number } | null = null;
    let mostUnique: { pickNumber: number; playerName: string } | null = null;
    let bestPopularCount = 0;
    for (const p of d.picks) {
      const totalForKey = slotPlayerCount.get(`${p.pickNumber}:${p.playerId}`) ?? 1;
      const otherCount = totalForKey - 1;
      if (otherCount > bestPopularCount) {
        bestPopularCount = otherCount;
        mostPopular = { pickNumber: p.pickNumber, playerName: p.playerName, otherCount };
      }
      if (otherCount === 0 && !mostUnique) {
        mostUnique = { pickNumber: p.pickNumber, playerName: p.playerName };
      } else if (otherCount === 0 && mostUnique && p.pickNumber < mostUnique.pickNumber) {
        mostUnique = { pickNumber: p.pickNumber, playerName: p.playerName };
      }
    }

    return {
      userId: d.userId,
      userName: d.userName,
      userImage: d.userImage,
      teamAbbreviation: d.teamAbbreviation,
      teamName: d.teamName,
      teamPrimaryColor: d.teamPrimaryColor,
      boardId: d.boardId,
      boardTitle: d.boardTitle,
      boardStatus: d.boardStatus,
      pickCount: d.picks.length,
      picks: d.picks,
      isMe: d.userId === viewerUserId,
      overlapCount: overlapPlayerIds.size,
      exactSlotMatches,
      grade: grade
        ? {
            letterGrade: grade.letterGrade,
            summary: grade.summary,
            steals: grade.steals,
            solid: grade.solid,
            reaches: grade.reaches,
            busts: grade.busts,
          }
        : null,
      positionBreakdown,
      mostPopular,
      mostUnique,
    };
  });

  memberDrafts.sort((a, b) => {
    if (a.isMe) return -1;
    if (b.isMe) return 1;
    return a.userName.localeCompare(b.userName);
  });

  return { memberDrafts, myPickByNumberMap };
}
