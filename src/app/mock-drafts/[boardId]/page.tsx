import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getDraftOrder,
  getPlayers,
  getBoardWithPicks,
  getPoolsForUser,
} from "@/lib/queries";
import { PickBuilder } from "@/app/admin/board/[boardId]/pick-builder";
import { isDraftLocked } from "@/lib/config";
import { DraftLockedBanner } from "@/components/draft-locked-banner";
import { MockGradeCard } from "@/components/mock-grade-card";
import { FeatureDisabled } from "@/components/feature-disabled";
import { InnerPageHeader } from "@/components/inner-page-header";
import { getPoolSettings } from "@/lib/pool-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

export default async function EditMockDraftPage({ params }: { params: Params }) {
  const { boardId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.status !== "active") redirect("/");

  const locked = await isDraftLocked();

  const userPools = await getPoolsForUser(session.user.id);
  if (userPools.length > 0) {
    const settings = getPoolSettings(userPools[0].settings);
    if (!isFeatureEnabled(settings, "mockDraft")) {
      return <FeatureDisabled featureLabel="Mock Drafts" />;
    }
  }

  const boardData = await getBoardWithPicks(boardId);
  if (!boardData) notFound();
  if (boardData.board.createdBy !== session.user.id) {
    // Visitors can only view someone else's board on the read-only /picks/[boardId] route.
    redirect(`/picks/${boardId}`);
  }

  const season = boardData.board.season;
  const draftOrder = await getDraftOrder(season);
  const allPlayers = await getPlayers();
  const pickedPlayerIds = new Set(boardData.picks.map((p) => p.playerId));
  const availablePlayers = allPlayers.filter((p) => !pickedPlayerIds.has(p.id));

  const isEntry = boardData.board.isEntryDraft;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {locked && <DraftLockedBanner />}

      <InnerPageHeader
        title={boardData.board.title.toUpperCase()}
        subtitle={`${season} · ${boardData.picks.length}/32 picks made${isEntry ? " · ENTRY" : ""}`}
        teamCode={session.user.favoriteTeam?.abbreviation ?? null}
      />

      <main className="mx-auto max-w-7xl w-full px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/mock-drafts"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              ← All Mock Drafts
            </Link>
            <div className="flex items-center gap-2">
              {isEntry && (
                <span className="rounded-full border border-[var(--accent-primary)] bg-[var(--accent-light)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  Entry
                </span>
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  boardData.board.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {boardData.board.status}
              </span>
            </div>
          </div>

          {boardData.picks.length > 0 && (
            <MockGradeCard
              boardId={boardData.board.id}
              teamCode={session.user.favoriteTeam?.abbreviation ?? null}
            />
          )}
          <PickBuilder
            boardId={boardData.board.id}
            boardStatus={boardData.board.status}
            draftOrder={draftOrder}
            existingPicks={boardData.picks}
            availablePlayers={availablePlayers}
            readOnly={locked}
            favoriteTeamAbbr={session.user.favoriteTeam?.abbreviation ?? null}
          />
        </div>
      </main>
    </div>
  );
}
