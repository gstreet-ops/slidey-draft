import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getBoardWithPicks,
  getPoolsForUser,
  getPoolMembers,
  getUserBoard,
} from "@/lib/queries";
import { gradeMockDraft } from "@/lib/mock-grading";
import type { MockDraftGrade } from "@/lib/mock-grading";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { draftBoards, picks } from "@/db/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import { GradeCircle } from "@/components/grade-circle";
import { FeatureDisabled } from "@/components/feature-disabled";
import { InnerPageHeader } from "@/components/inner-page-header";
import { TeamImage } from "@/components/team-image";
import { getPoolSettings } from "@/lib/pool-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const season = 2026;
  const userId = session.user.id;

  const userPools = await getPoolsForUser(userId);
  if (userPools.length > 0) {
    const settings = getPoolSettings(userPools[0].settings);
    if (!isFeatureEnabled(settings, "mockDraft")) {
      return <FeatureDisabled featureLabel="Mock Drafts" />;
    }
  }

  const myBoard = await getUserBoard(userId, season);
  const myBoardData = myBoard ? await getBoardWithPicks(myBoard.id) : null;
  const myGrade =
    myBoardData && myBoardData.board.status === "published" && myBoardData.picks.length > 0
      ? gradeMockDraft(
          myBoardData.picks.map((p) => ({
            pickNumber: p.pickNumber,
            playerGrade: p.playerGrade,
            playerRank: p.playerRank,
          })),
        )
      : null;
  const myPickCount = myBoardData?.picks.length ?? 0;

  type PoolmateBoard = {
    userId: string;
    userName: string;
    boardId: string;
    pickCount: number;
    grade: MockDraftGrade | null;
    noteCount: number;
    latestNote: string | null;
  };
  const poolmateBoards: PoolmateBoard[] = [];
  let poolName: string | null = null;

  if (userPools.length > 0) {
    poolName = userPools[0].poolName;
    const members = await getPoolMembers(userPools[0].poolId);
    for (const m of members) {
      if (m.userId === userId) continue;
      const [memberBoard] = await db
        .select({ id: draftBoards.id, status: draftBoards.status })
        .from(draftBoards)
        .where(
          and(
            eq(draftBoards.createdBy, m.userId),
            eq(draftBoards.season, season),
            eq(draftBoards.isEntryDraft, true)
          )
        );
      if (memberBoard?.status !== "published") continue;

      const data = await getBoardWithPicks(memberBoard.id);
      if (!data || data.picks.length === 0) continue;

      const grade = gradeMockDraft(
        data.picks.map((p) => ({
          pickNumber: p.pickNumber,
          playerGrade: p.playerGrade,
          playerRank: p.playerRank,
        })),
      );
      const noteCount = data.picks.filter((p) => p.analysis).length;
      const [latestNoteRow] = await db
        .select({ analysis: picks.analysis })
        .from(picks)
        .where(and(eq(picks.boardId, memberBoard.id), isNotNull(picks.analysis)))
        .orderBy(desc(picks.createdAt))
        .limit(1);

      poolmateBoards.push({
        userId: m.userId,
        userName: m.userName || m.userEmail,
        boardId: memberBoard.id,
        pickCount: data.picks.length,
        grade,
        noteCount,
        latestNote: latestNoteRow?.analysis ?? null,
      });
    }
    poolmateBoards.sort((a, b) => a.userName.localeCompare(b.userName));
  }

  const myStatus = myBoardData?.board.status;
  const isPublished = myStatus === "published";

  const teamCode = session.user.favoriteTeam?.abbreviation ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <InnerPageHeader
        title="MOCK DRAFTS"
        subtitle={poolName ? `${poolName} — 2026 NFL Mock Draft` : "2026 NFL Mock Draft"}
        teamCode={teamCode}
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Your Mock Draft */}
        <section className="mt-8">
          <h2
            className="text-lg font-bold text-[var(--text-primary)] tracking-wide mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            YOUR MOCK DRAFT
          </h2>

          {myBoard && myBoardData ? (
            <Link
              href="/mock-drafts"
              className="group block rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-5 shadow-sm hover:shadow-md transition sm:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="float-right ml-3">
                    <TeamImage teamCode={teamCode} variant="logo" size={36} fallback="initials" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {isPublished ? "Published" : "Draft"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{myPickCount}/32 picks</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                    {myBoardData.board.title || "Your Mock Draft"}
                  </p>
                  {myGrade && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {myGrade.steals} steal{myGrade.steals !== 1 ? "s" : ""} &middot;{" "}
                      {myGrade.reaches} reach{myGrade.reaches !== 1 ? "es" : ""}
                    </p>
                  )}
                  {isPublished && (
                    <p className="mt-2 text-xs text-[var(--steelers-gold)]">
                      This is your official pool entry.
                    </p>
                  )}
                  <span className="mt-4 inline-block rounded-lg bg-[var(--steelers-gold)] px-5 py-2 text-sm font-bold text-[var(--accent-text)] group-hover:bg-[var(--steelers-gold)]/80 transition">
                    {isPublished ? "Edit Your Mock \u2192" : "Continue Building \u2192"}
                  </span>
                </div>
                {myGrade && (
                  <div className="shrink-0">
                    <GradeCircle grade={myGrade.letterGrade} size="md" />
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <Link
              href="/mock-drafts"
              className="group block rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-center hover:border-[var(--slidey)]/50 hover:bg-gray-50 transition sm:p-8"
            >
              <p className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--slidey)] transition sm:text-lg">
                + Start Your Mock Draft
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Build your 32-pick board and publish it as your pool entry.
              </p>
            </Link>
          )}
        </section>

        {/* Pool Mock Drafts */}
        <section className="mt-10">
          <h2
            className="text-lg font-bold text-[var(--text-primary)] tracking-wide mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            POOL MOCK DRAFTS
          </h2>

          {poolmateBoards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {poolmateBoards.map((pb) => (
                <Link
                  key={pb.boardId}
                  href={`/picks/${pb.boardId}`}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-[var(--slidey)]/40 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--slidey)] transition truncate">
                        {pb.userName}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{pb.pickCount}/32 picks</p>
                      {pb.grade && (
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {pb.grade.steals} steal{pb.grade.steals !== 1 ? "s" : ""} &middot;{" "}
                          {pb.grade.reaches} reach{pb.grade.reaches !== 1 ? "es" : ""}
                        </p>
                      )}
                      {pb.latestNote && (
                        <p className="mt-2 text-xs italic text-[var(--text-secondary)] line-clamp-2">
                          &ldquo;{pb.latestNote.length > 100 ? pb.latestNote.slice(0, 100) + "\u2026" : pb.latestNote}&rdquo;
                        </p>
                      )}
                      {pb.noteCount > 0 && !pb.latestNote && (
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {"\uD83D\uDCAC"} {pb.noteCount} note{pb.noteCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    {pb.grade && (
                      <div className="shrink-0">
                        <GradeCircle grade={pb.grade.letterGrade} size="sm" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                {userPools.length === 0
                  ? "Join a pool to see your friends' mock drafts here."
                  : "No one in your pool has published a mock yet. Be the first!"}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
