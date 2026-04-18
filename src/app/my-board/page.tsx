import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getDraftOrder, getPlayers, getBoardWithPicks, getPoolsForUser, getPoolMembers } from "@/lib/queries";
import { createUserBoard } from "@/lib/actions";
import { PickBuilder } from "@/app/admin/board/[boardId]/pick-builder";
import Link from "next/link";
import { isDraftLocked } from "@/lib/config";
import { DraftLockedBanner } from "@/components/draft-locked-banner";
import { MockGradeCard } from "@/components/mock-grade-card";
import { FeatureDisabled } from "@/components/feature-disabled";
import { InnerPageHeader } from "@/components/inner-page-header";
import { getPoolSettings } from "@/lib/pool-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { db } from "@/db";
import { draftBoards, picks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type MobileLayout = "tabs" | "drawer";

export default async function MyBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.status !== "active") redirect("/");

  const params = await searchParams;
  const mobileLayout: MobileLayout = params.layout === "drawer" ? "drawer" : "tabs";

  const season = 2026;
  const locked = await isDraftLocked();

  const userPools = await getPoolsForUser(session.user.id);
  if (userPools.length > 0) {
    const settings = getPoolSettings(userPools[0].settings);
    if (!isFeatureEnabled(settings, "mockDraft")) {
      return <FeatureDisabled featureLabel="Mock Drafts" />;
    }
  }

  let board = await getUserBoard(session.user.id, season);

  if (!board) {
    board = await createUserBoard(season);
  }

  const boardData = await getBoardWithPicks(board.id);
  if (!boardData) redirect("/");

  const draftOrder = await getDraftOrder(season);
  const allPlayers = await getPlayers();
  const pickedPlayerIds = new Set(boardData.picks.map((p) => p.playerId));
  const availablePlayers = allPlayers.filter((p) => !pickedPlayerIds.has(p.id));

  // Get pool members' boards
  type PoolmatBoard = { userId: string; userName: string; boardId: string; pickCount: number; status: string };
  const poolmateBoards: PoolmatBoard[] = [];

  if (userPools.length > 0) {
    const members = await getPoolMembers(userPools[0].poolId);
    for (const m of members) {
      if (m.userId === session.user.id) continue;
      const [memberBoard] = await db
        .select({ id: draftBoards.id, status: draftBoards.status })
        .from(draftBoards)
        .where(and(eq(draftBoards.createdBy, m.userId), eq(draftBoards.season, season)));
      if (memberBoard && memberBoard.status === "published") {
        const [count] = await db
          .select({ c: sql<number>`count(*)` })
          .from(picks)
          .where(eq(picks.boardId, memberBoard.id));
        poolmateBoards.push({
          userId: m.userId,
          userName: m.userName || m.userEmail,
          boardId: memberBoard.id,
          pickCount: Number(count.c),
          status: memberBoard.status,
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {locked && <DraftLockedBanner />}

      <InnerPageHeader
        title="YOUR MOCK DRAFT"
        subtitle={`${season} · ${boardData.picks.length}/32 picks made`}
        teamCode={session.user.favoriteTeam?.abbreviation ?? null}
      />

      <main className="mx-auto max-w-7xl w-full px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile-only layout toggle (Tabs vs Drawer) */}
            <div className="md:hidden inline-flex rounded-full border border-gray-200 bg-gray-100 p-0.5 text-[11px] font-semibold">
              <Link
                href="/my-board?layout=tabs"
                replace
                scroll={false}
                className={`rounded-full px-3 py-1 transition ${
                  mobileLayout === "tabs"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm"
                    : "text-[var(--text-muted)]"
                }`}
              >
                Tabs
              </Link>
              <Link
                href="/my-board?layout=drawer"
                replace
                scroll={false}
                className={`rounded-full px-3 py-1 transition ${
                  mobileLayout === "drawer"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm"
                    : "text-[var(--text-muted)]"
                }`}
              >
                Drawer
              </Link>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ml-auto ${
                boardData.board.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {boardData.board.status}
            </span>
          </div>

          {boardData.picks.length > 0 && (
            <MockGradeCard boardId={board.id} teamCode={session.user.favoriteTeam?.abbreviation ?? null} />
          )}

          <PickBuilder
            boardId={board.id}
            boardStatus={boardData.board.status}
            draftOrder={draftOrder}
            existingPicks={boardData.picks}
            availablePlayers={availablePlayers}
            readOnly={locked}
            favoriteTeamAbbr={session.user.favoriteTeam?.abbreviation ?? null}
            mobileLayout={mobileLayout}
          />
        </div>

        {/* Pool Members' Boards */}
        {poolmateBoards.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2
              className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              YOUR POOL&apos;S MOCK DRAFTS
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {poolmateBoards.map((pb) => (
                <Link
                  key={pb.boardId}
                  href={`/picks/${pb.boardId}`}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-[var(--slidey)]/40 hover:bg-gray-50 transition"
                >
                  <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--slidey)] transition truncate">{pb.userName}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{pb.pickCount}/32 picks &middot; {pb.status}</p>
                </Link>
              ))}
            </div>
            <Link href="/picks" className="text-xs text-[var(--steelers-gold)] hover:underline">
              View all mock drafts &rarr;
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
