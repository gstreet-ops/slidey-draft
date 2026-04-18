import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { draftBoards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getBoardWithPicks,
  getPoolsForUser,
  getPoolMembers,
} from "@/lib/queries";
import { InnerPageHeader } from "@/components/inner-page-header";
import { SiteFooter } from "@/components/site-footer";
import { PoolDraftsList, type MemberDraft, type ComparePick } from "./pool-drafts-list";

export const dynamic = "force-dynamic";

export default async function MockDraftsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const season = 2026;
  const userId = session.user.id;
  const teamCode = session.user.favoriteTeam?.abbreviation ?? null;

  const userPools = await getPoolsForUser(userId);
  if (userPools.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
        <InnerPageHeader title="POOL MOCK DRAFTS" subtitle="Join a pool to see how everyone is building their board" teamCode={teamCode} />
        <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-12 sm:px-6">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[var(--text-secondary)]">
              You&apos;re not in any pools yet. Once you join one, every member&apos;s mock draft shows up here.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const pool = userPools[0];

  // Fetch all members + their boards
  const members = await getPoolMembers(pool.poolId);

  type RawDraft = {
    userId: string;
    userName: string;
    userImage: string | null;
    boardId: string | null;
    boardTitle: string | null;
    boardStatus: string | null;
    picks: Array<ComparePick>;
  };

  const drafts: RawDraft[] = [];
  for (const m of members) {
    const [board] = await db
      .select({
        id: draftBoards.id,
        title: draftBoards.title,
        status: draftBoards.status,
      })
      .from(draftBoards)
      .where(and(eq(draftBoards.createdBy, m.userId), eq(draftBoards.season, season)));

    if (!board) {
      drafts.push({
        userId: m.userId,
        userName: m.userName || m.userEmail,
        userImage: m.userImage,
        boardId: null,
        boardTitle: null,
        boardStatus: null,
        picks: [],
      });
      continue;
    }

    const data = await getBoardWithPicks(board.id);
    drafts.push({
      userId: m.userId,
      userName: m.userName || m.userEmail,
      userImage: m.userImage,
      boardId: board.id,
      boardTitle: board.title,
      boardStatus: board.status,
      picks: (data?.picks ?? []).map<ComparePick>((p) => ({
        pickNumber: p.pickNumber,
        playerId: p.playerId,
        playerName: p.playerName,
        playerPosition: p.playerPosition,
        playerSchool: p.playerSchool,
        teamAbbreviation: p.teamAbbreviation,
        teamName: p.teamName,
        teamLogoUrl: p.teamLogoUrl,
        teamPrimaryColor: p.teamPrimaryColor,
      })),
    });
  }

  // Pull current user's picks once for comparison
  const me = drafts.find((d) => d.userId === userId);
  const myPicks = me?.picks ?? [];
  const myPlayerIds = new Set(myPicks.map((p) => p.playerId));
  const myPickByNumber = new Map(myPicks.map((p) => [p.pickNumber, p]));

  // Build view-model with comparison stats
  const memberDrafts: MemberDraft[] = drafts.map((d) => {
    const overlapPlayerIds = new Set(
      d.picks.filter((p) => myPlayerIds.has(p.playerId)).map((p) => p.playerId)
    );
    const exactSlotMatches = d.picks.filter((p) => {
      const mine = myPickByNumber.get(p.pickNumber);
      return !!mine && mine.playerId === p.playerId;
    }).length;

    return {
      userId: d.userId,
      userName: d.userName,
      userImage: d.userImage,
      boardId: d.boardId,
      boardTitle: d.boardTitle,
      boardStatus: d.boardStatus,
      pickCount: d.picks.length,
      picks: d.picks,
      isMe: d.userId === userId,
      overlapCount: overlapPlayerIds.size,
      exactSlotMatches,
    };
  });

  // Sort: me first, then alphabetically by name
  memberDrafts.sort((a, b) => {
    if (a.isMe) return -1;
    if (b.isMe) return 1;
    return a.userName.localeCompare(b.userName);
  });

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <InnerPageHeader
        title="POOL MOCK DRAFTS"
        subtitle={`${pool.poolName} — see how everyone is building their board`}
        teamCode={teamCode}
      />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-6 sm:px-6 sm:py-10">
        <PoolDraftsList drafts={memberDrafts} myPickByNumber={Object.fromEntries(myPickByNumber)} totalSlots={32} />
      </main>
      <SiteFooter />
    </div>
  );
}
