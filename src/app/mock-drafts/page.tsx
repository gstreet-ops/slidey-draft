import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { DraftLockedBanner } from "@/components/draft-locked-banner";
import { InnerPageHeader } from "@/components/inner-page-header";
import { FeatureDisabled } from "@/components/feature-disabled";
import { PoolDraftsList } from "@/components/pool-drafts-list";
import { MyDraftsSection, type MyBoardCard } from "@/components/my-drafts-section";
import { createUserBoard } from "@/lib/actions";
import { getUserBoards, getBoardWithPicks, getPoolsForUser } from "@/lib/queries";
import { getPoolMemberDrafts } from "@/lib/mock-drafts-data";
import { getPoolSettings } from "@/lib/pool-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { gradeMockDraft } from "@/lib/mock-grading";

export const dynamic = "force-dynamic";

export default async function MockDraftsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.status !== "active") redirect("/");

  const season = 2026;
  const locked = await isDraftLocked();
  const userId = session.user.id;
  const teamCode = session.user.favoriteTeam?.abbreviation ?? null;
  const teamName = session.user.favoriteTeam?.name ?? null;

  const userPools = await getPoolsForUser(userId);
  if (userPools.length > 0) {
    const settings = getPoolSettings(userPools[0].settings);
    if (!isFeatureEnabled(settings, "mockDraft")) {
      return <FeatureDisabled featureLabel="Mock Drafts" />;
    }
  }

  // 1. Your boards — if none exist, create the first one so the page always
  //    has at least one tappable card to land on.
  let myBoards = await getUserBoards(userId, season);
  if (myBoards.length === 0) {
    await createUserBoard(season);
    myBoards = await getUserBoards(userId, season);
  }

  const myBoardCards: MyBoardCard[] = await Promise.all(
    myBoards.map(async (b) => {
      const data = await getBoardWithPicks(b.id);
      const picks = data?.picks ?? [];
      const grade =
        picks.length > 0
          ? gradeMockDraft(
              picks.map((p) => ({
                pickNumber: p.pickNumber,
                playerGrade: p.playerGrade,
                playerRank: p.playerRank,
              }))
            ).letterGrade
          : null;
      return {
        boardId: b.id,
        title: b.title,
        status: b.status,
        pickCount: picks.length,
        isEntry: b.isEntryDraft,
        grade,
      };
    })
  );

  // 2. Pool drafts — other members only. Entry-flag filter enforced by helper.
  let poolMemberDrafts: Awaited<ReturnType<typeof getPoolMemberDrafts>>["memberDrafts"] = [];
  let myPickByNumberMap: Awaited<ReturnType<typeof getPoolMemberDrafts>>["myPickByNumberMap"] = {};
  let poolName: string | null = null;
  if (userPools.length > 0) {
    poolName = userPools[0].poolName;
    const enriched = await getPoolMemberDrafts(userPools[0].poolId, season, userId);
    poolMemberDrafts = enriched.memberDrafts.filter((d) => !d.isMe);
    myPickByNumberMap = enriched.myPickByNumberMap;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {locked && <DraftLockedBanner />}

      <InnerPageHeader
        title="MOCK DRAFTS"
        subtitle="Build your board, browse the competition"
        teamCode={teamCode}
      />

      <main className="mx-auto max-w-4xl w-full px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8 space-y-10">
        {/* YOUR DRAFTS */}
        <section className="space-y-3">
          <div>
            <h2
              className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              YOUR DRAFTS
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Tap to edit. Your <span className="font-semibold text-[var(--accent-primary)]">Entry</span> draft is the one that&apos;s scored.
            </p>
          </div>
          <MyDraftsSection
            boards={myBoardCards}
            favoriteTeamCode={teamCode}
            favoriteTeamName={teamName}
          />
        </section>

        {/* POOL DRAFTS */}
        {poolMemberDrafts.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h2
                className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {poolName ? `${poolName.toUpperCase()} MOCK DRAFTS` : "POOL MOCK DRAFTS"}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                See how everyone is building their board — tap to compare picks side by side.
              </p>
            </div>
            <PoolDraftsList
              drafts={poolMemberDrafts}
              myPickByNumber={myPickByNumberMap}
              totalSlots={32}
            />
          </section>
        ) : userPools.length === 0 ? (
          <section className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Join a pool to browse your friends&apos; drafts here.
            </p>
            <Link
              href="/pools"
              className="mt-3 inline-block text-sm font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
            >
              Find a pool →
            </Link>
          </section>
        ) : null}
      </main>
    </div>
  );
}
