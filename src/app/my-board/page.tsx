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
import { getPoolSettings } from "@/lib/pool-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { db } from "@/db";
import { draftBoards, picks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MyBoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.status !== "active") redirect("/");

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
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[var(--lions-blue)]/[0.04] to-transparent" />
      {locked && <DraftLockedBanner />}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-white tracking-wide sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                YOUR MOCK DRAFT
              </h1>
              <p className="mt-1 text-xs text-white/50 sm:text-sm">
                {season} &middot; {boardData.picks.length}/32 picks made
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                boardData.board.status === "published"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {boardData.board.status}
            </span>
          </div>

          {boardData.picks.length > 0 && (
            <MockGradeCard boardId={board.id} />
          )}

          <PickBuilder
            boardId={board.id}
            boardStatus={boardData.board.status}
            draftOrder={draftOrder}
            existingPicks={boardData.picks}
            availablePlayers={availablePlayers}
            readOnly={locked}
          />
        </div>

        {/* Pool Members' Boards */}
        {poolmateBoards.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              YOUR POOL&apos;S MOCK DRAFTS
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {poolmateBoards.map((pb) => (
                <Link
                  key={pb.boardId}
                  href={`/picks/${pb.boardId}`}
                  className="group rounded-xl border border-white/[0.12] bg-white/8 p-4 hover:border-[var(--slidey)]/40 hover:bg-white/[0.07] transition"
                >
                  <p className="text-sm font-bold text-white group-hover:text-[var(--slidey)] transition truncate">{pb.userName}</p>
                  <p className="text-xs text-white/50 mt-1">{pb.pickCount}/32 picks &middot; {pb.status}</p>
                </Link>
              ))}
            </div>
            <Link href="/picks" className="text-xs text-[var(--lions-blue)] hover:underline">
              View all mock drafts &rarr;
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
