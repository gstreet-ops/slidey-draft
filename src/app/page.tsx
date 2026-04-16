import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { getBoards, getPoolsForUser, getPlayers, getLeaderboard, getBoardWithPicks, getUserBoard, getPoolMembers } from "@/lib/queries";
import { gradeMockDraft } from "@/lib/mock-grading";
import type { MockDraftGrade } from "@/lib/mock-grading";
import { GradeCircle } from "@/components/grade-circle";
import { db } from "@/db";
import { draftBoards, picks } from "@/db/schema";
import { eq, and, sql as dsql, isNotNull, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { SpectatorBanner } from "@/components/spectator-banner";
import { InviteCodeInput } from "@/components/invite-code-input";
import { SiteFooter } from "@/components/site-footer";
import { PlayerAvatar } from "@/components/player-avatar";
import { getPoolSettings, DEFAULT_POOL_SETTINGS } from "@/lib/pool-settings";
import { FEATURES, getEnabledFeatures } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const locked = await isDraftLocked();
  const isSpectator = session?.user && session.user.status === "spectator";
  const isLoggedIn = !!session?.user && !isSpectator;

  return (
    <div className="min-h-screen bg-[#1e3d5f] flex flex-col">
      {isSpectator && <SpectatorBanner />}

      {isLoggedIn ? (
        <LoggedInDashboard session={session!} locked={locked} />
      ) : (
        <LandingPage session={session} locked={locked} isSpectator={!!isSpectator} />
      )}

      <SiteFooter />
    </div>
  );
}

// ── LOGGED-IN DASHBOARD HUB ──

async function LoggedInDashboard({ session, locked }: { session: Session; locked: boolean }) {
  const user = session.user;
  const userId = user.id;

  const [userPools, myBoard] = await Promise.all([
    getPoolsForUser(userId),
    getUserBoard(userId, 2026),
  ]);

  // Fetch pool members' published boards (including current user)
  type PoolmateBoard = { userId: string; userName: string; boardId: string; pickCount: number; poolName: string; grade: MockDraftGrade | null; noteCount: number; latestNote: string | null };
  const poolmateBoards: PoolmateBoard[] = [];
  if (userPools.length > 0) {
    const pool = userPools[0];
    const members = await getPoolMembers(pool.poolId);
    for (const m of members) {
      const [memberBoard] = await db
        .select({ id: draftBoards.id, status: draftBoards.status })
        .from(draftBoards)
        .where(and(eq(draftBoards.createdBy, m.userId), eq(draftBoards.season, 2026)));
      if (memberBoard?.status === "published") {
        const boardData = await getBoardWithPicks(memberBoard.id);
        const grade = boardData && boardData.picks.length > 0
          ? gradeMockDraft(boardData.picks.map(p => ({
              pickNumber: p.pickNumber,
              playerGrade: p.playerGrade,
              playerRank: p.playerRank,
            })))
          : null;
        const noteCount = boardData ? boardData.picks.filter(p => p.analysis).length : 0;
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
          pickCount: boardData?.picks.length ?? 0,
          poolName: pool.poolName,
          grade,
          noteCount,
          latestNote: latestNoteRow?.analysis ?? null,
        });
      }
    }
    // Sort: current user first, then alphabetically
    poolmateBoards.sort((a, b) => {
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      return a.userName.localeCompare(b.userName);
    });
  }

  const draftDate = new Date("2026-04-23T20:00:00-04:00");
  const now = new Date();
  const daysUntilDraft = Math.max(0, Math.ceil((draftDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isDraftHere = now >= draftDate;

  const firstName = user.name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const isAdmin = user.role === "admin";
  const isCommissioner = user.role === "commissioner" || isAdmin;
  const inPool = userPools.length > 0;

  const poolSettings = inPool ? getPoolSettings(userPools[0].settings) : { ...DEFAULT_POOL_SETTINGS };
  const enabled = getEnabledFeatures(poolSettings);
  const mockDraftEnabled = enabled.has("mockDraft");
  const liveEnabled = enabled.has("livePredictions");
  const triviaEnabled = enabled.has("trivia");
  const watchPartyEnabled = enabled.has("watchParty");
  const hasDraftNight = liveEnabled || triviaEnabled || watchPartyEnabled;
  const liveCtaLabel = liveEnabled
    ? "GO TO LIVE"
    : triviaEnabled
    ? "JOIN DRAFT NIGHT"
    : watchPartyEnabled
    ? "JOIN WATCH PARTY"
    : null;

  return (
    <main
      className="flex-1 px-4 py-8 sm:px-6 sm:py-12"
      style={{ background: "linear-gradient(180deg, #234b72 0%, #1e3d5f 40%, #1a3755 100%)" }}
    >
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Welcome */}
        <div className="flex items-center gap-4">
          {user.favoriteTeam?.logoUrl && (
            <Image src={user.favoriteTeam.logoUrl} alt="" width={48} height={48} className="object-contain" />
          )}
          <div>
            <h1
              className="text-2xl font-bold text-white tracking-wide sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Welcome back, {firstName}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm">
              {isDraftHere ? (
                <span className="text-green-400 font-semibold">Draft Night is HERE!</span>
              ) : (
                <span className="text-[var(--slidey)]">
                  {daysUntilDraft} day{daysUntilDraft !== 1 ? "s" : ""} until Draft Night
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isAdmin ? "bg-red-500/20 text-red-400"
                : isCommissioner ? "bg-yellow-500/20 text-yellow-400"
                : "bg-green-500/20 text-green-400"
              }`}>
                {isAdmin ? "admin" : isCommissioner ? "commissioner" : "active"}
              </span>
            </div>
          </div>
        </div>

        {/* Pool Members' Mock Drafts — primary engagement */}
        {inPool && mockDraftEnabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-bold text-white tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {userPools[0].poolName.toUpperCase()} MOCK DRAFTS
              </h2>
              <Link href="/picks" className="text-xs text-[var(--lions-blue)] hover:underline">See All &rarr;</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Show "Start Your Mock" card if user has no published board in pool */}
              {!poolmateBoards.some(pb => pb.userId === userId) && (
                <Link
                  href="/my-board"
                  className="group rounded-xl border-2 border-dashed border-[#3a6a94] bg-[#1e3d5f] p-4 hover:border-[#4a7eaa] hover:bg-[#264d73] transition flex items-center justify-center"
                >
                  <div className="text-center">
                    <p className="text-sm font-bold text-white/[0.75] group-hover:text-[var(--slidey)] transition">Start Your Mock &rarr;</p>
                    <p className="text-xs text-white/70 mt-1">Build your 32-pick board</p>
                  </div>
                </Link>
              )}
              {poolmateBoards.map((pb) => (
                <Link
                  key={pb.boardId}
                  href={pb.userId === userId ? "/my-board" : `/picks/${pb.boardId}`}
                  className="group rounded-xl border border-[#3a6a94] bg-[#264d73] p-4 hover:border-[var(--slidey)]/40 hover:bg-[#2d5a85] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-[var(--slidey)] transition truncate">
                        {pb.userId === userId ? "You" : pb.userName}
                      </p>
                      <p className="text-xs text-white/[0.75] mt-1">{pb.pickCount}/32 picks</p>
                      {pb.grade && (
                        <p className="text-[10px] text-white/70 mt-0.5">
                          {pb.grade.steals} steal{pb.grade.steals !== 1 ? "s" : ""} &middot; {pb.grade.reaches} reach{pb.grade.reaches !== 1 ? "es" : ""}
                        </p>
                      )}
                      {pb.latestNote && (
                        <p className="mt-1 text-xs italic text-white/[0.75] truncate">
                          💬 {pb.latestNote.length > 80 ? pb.latestNote.slice(0, 80) + "..." : pb.latestNote}
                        </p>
                      )}
                      {pb.noteCount > 0 && !pb.latestNote && (
                        <p className="mt-0.5 text-[10px] text-white/70">💬 {pb.noteCount} note{pb.noteCount !== 1 ? "s" : ""}</p>
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
          </div>
        )}

        {/* Primary CTA */}
        {inPool && liveCtaLabel ? (
          <Link
            href="/live"
            className="block rounded-xl border border-green-400/50 bg-[#1a4a3a] p-6 text-center hover:border-green-400/60 transition"
          >
            <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{liveCtaLabel}</p>
            <p className="text-xs text-white/[0.75] mt-1">Playing in: {userPools[0].poolName}{userPools.length > 1 ? ` + ${userPools.length - 1} more` : ""}</p>
          </Link>
        ) : inPool && !hasDraftNight ? null : (
          <div className="rounded-xl border border-[#3a6a94] bg-[#264d73] p-8 text-center space-y-4">
            <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>JOIN A POOL TO GET STARTED</p>
            <p className="text-sm text-white/[0.75] max-w-md mx-auto">Ask your commissioner for an invite link to join a pool and compete on draft night.</p>
            <InviteCodeInput />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.filter((f) => f.quickAction && enabled.has(f.key)).map((f) => {
            const qa = f.quickAction!;
            const isMyBoard = f.key === "mockDraft";
            return (
              <QuickAction
                key={f.key}
                href={qa.href}
                title={isMyBoard && myBoard ? "My Mock Draft" : isMyBoard ? "Create Your Mock Draft" : qa.title}
                desc={isMyBoard && myBoard ? "Edit your picks" : qa.desc}
                icon={qa.icon}
              />
            );
          })}
          <QuickAction href="/guide" title="How to Play" desc="Rules & tips" icon={"\uD83D\uDCD6"} />
          {isAdmin && (
            <QuickAction href="/admin" title="Admin Panel" desc="Manage the platform" icon={"\uD83D\uDD27"} />
          )}
        </div>
      </div>
    </main>
  );
}

function QuickAction({ href, title, desc, icon, highlight }: { href: string; title: string; desc: string; icon: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-4 transition ${
        highlight
          ? "border-green-500/30 bg-green-500/10 hover:border-green-400/50"
          : "border-[#3a6a94] bg-[#264d73] hover:border-[#4a7eaa] hover:bg-[#2d5a85]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-white/[0.75]">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

// ── LANDING PAGE (visitors / spectators) ──

async function LandingPage({ session, locked, isSpectator }: { session: Session | null; locked: boolean; isSpectator: boolean }) {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");
  const allPlayers = await getPlayers();
  const topProspects = allPlayers.filter((p) => p.rank).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 8);
  const leaderboard = await getLeaderboard(2026);
  const topRanked = leaderboard.slice(0, 5);

  let featuredPicks: NonNullable<Awaited<ReturnType<typeof getBoardWithPicks>>>["picks"] = [];
  const publishedGrades: Array<{ boardId: string; createdBy: string | null; title: string; grade: MockDraftGrade }> = [];
  for (const b of published) {
    const boardData = await getBoardWithPicks(b.id);
    if (boardData && boardData.picks.length > 0) {
      if (featuredPicks.length === 0) featuredPicks = boardData.picks.slice(0, 6);
      const grade = gradeMockDraft(boardData.picks.map(p => ({
        pickNumber: p.pickNumber,
        playerGrade: p.playerGrade,
        playerRank: p.playerRank,
      })));
      publishedGrades.push({ boardId: b.id, createdBy: b.createdBy, title: b.title, grade });
    }
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-[var(--lions-blue)]/15 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl space-y-5">
          <div className="inline-block rounded-full bg-[#0076B6] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:text-xs">
            2026 NFL Draft &middot; April 23 &middot; Pittsburgh
          </div>
          <h1
            className="text-5xl font-bold text-white tracking-wider leading-none sm:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            DRAFT DAY<br /><span className="text-[var(--slidey)]">CHALLENGE</span>
          </h1>
          <p className="text-sm text-white/[0.75] max-w-md mx-auto sm:text-base">
            Build a mock draft, join a pool, and score points live as Roger Goodell reads the cards.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-4">
            {locked ? (
              <Link href="/live" className="w-full rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--lions-blue)]/25 hover:bg-[var(--lions-blue)]/80 transition sm:w-auto">
                Watch Live
              </Link>
            ) : session?.user ? (
              <Link href="/my-board" className="w-full rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--lions-blue)]/25 hover:bg-[var(--lions-blue)]/80 transition sm:w-auto">
                Make Your Picks
              </Link>
            ) : (
              <Link href="/login" className="w-full rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--lions-blue)]/25 hover:bg-[var(--lions-blue)]/80 transition sm:w-auto">
                Sign In &amp; Draft
              </Link>
            )}
            <Link href="/picks" className="w-full rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition sm:w-auto">
              View Mock Drafts {published.length > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">{published.length}</span>}
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-lg font-bold text-gray-900 tracking-wide mb-8 sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0076B6]/10 text-[#0076B6] text-xl font-bold">1</div>
              <h3 className="text-sm font-bold text-gray-900">Build Your Mock Draft</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pick who you think goes where in Round 1. Predict the board before the real draft happens — the closer you are, the more bonus points you earn.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0076B6]/10 text-[#0076B6] text-xl font-bold">2</div>
              <h3 className="text-sm font-bold text-gray-900">Join a Pool</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Create or join a private pool with friends. Each pool has its own leaderboard, settings, and bragging rights. Get an invite code to start.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0076B6]/10 text-[#0076B6] text-xl font-bold">3</div>
              <h3 className="text-sm font-bold text-gray-900">Predict Live on Draft Night</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                When a team is on the clock, predict who they&apos;ll pick before the card is read. Nail it for 10 points. Compete pick-by-pick all night.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INVITE CTA ── */}
      {!session?.user || isSpectator ? (
        <section className="bg-[#F0F4F8] px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl text-center space-y-4">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
              {isSpectator ? "UNLOCK FULL ACCESS" : "GET IN THE GAME"}
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {isSpectator
                ? "You're browsing as a spectator. Got an invite code? Enter it below to join a pool and start competing."
                : "Sign in and enter an invite code to start competing. Ask a friend who's already playing, or request one from the commissioner."}
            </p>
            {isSpectator ? (
              <InviteCodeInput />
            ) : (
              <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
                <Link href="/login" className="rounded-lg bg-[#0076B6] px-6 py-3 text-sm font-bold text-white hover:bg-[#0076B6]/80 transition">
                  Sign In to Get Started
                </Link>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* ── MAIN CONTENT (2-column grid) ── */}
      <section className="bg-[#1e3d5f] px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Left column */}
          <div className="space-y-8">
            {/* Mock Draft Grades — most engaging for visitors */}
            {publishedGrades.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                    MOCK DRAFT GRADES
                  </h2>
                  <Link href="/picks" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">All Boards &rarr;</Link>
                </div>
                <div className="rounded-xl border border-[#3a6a94] bg-[#264d73] overflow-hidden">
                  {publishedGrades.map((entry, i) => (
                    <Link
                      key={entry.boardId}
                      href={`/picks/${entry.boardId}`}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition ${i !== publishedGrades.length - 1 ? "border-b border-white/5" : ""}`}
                    >
                      <GradeCircle grade={entry.grade.letterGrade} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                        <p className="text-[10px] text-white/[0.75]">
                          {entry.grade.steals} steal{entry.grade.steals !== 1 ? "s" : ""} &middot; {entry.grade.reaches} reach{entry.grade.reaches !== 1 ? "es" : ""} &middot; {entry.grade.totalPicks}/32 picks
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Picks */}
            {featuredPicks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                    FEATURED PICKS
                  </h2>
                  <Link href="/picks" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">See All Boards &rarr;</Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {featuredPicks.map((pick) => (
                    <div key={pick.id} className="rounded-xl border border-[#3a6a94] bg-[#264d73] p-3 text-center transition hover:border-white/20">
                      <div className="mb-2 flex items-center justify-center gap-1.5">
                        {pick.teamLogoUrl && (
                          <Image src={pick.teamLogoUrl} alt="" width={20} height={20} className="object-contain" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/[0.75]">Pick {pick.pickNumber}</span>
                      </div>
                      <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full border-2 sm:h-14 sm:w-14"
                        style={{ borderColor: pick.teamPrimaryColor || "rgba(255,255,255,0.1)" }}>
                        <PlayerAvatar player={{ name: pick.playerName ?? "TBD", imageUrl: pick.playerImageUrl, position: pick.playerPosition ?? "" }} size={56} />
                      </div>
                      <p className="text-xs font-bold text-white truncate">{pick.playerName ?? "TBD"}</p>
                      <p className="text-[10px] text-white/[0.75]">{pick.playerPosition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Prospects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                  TOP PROSPECTS
                </h2>
                <Link href="/my-board" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">View All &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {topProspects.map((p) => (
                  <div key={p.id} className="group relative rounded-xl border border-[#3a6a94] bg-[#264d73] p-3 text-center transition hover:border-[var(--lions-blue)]/40 hover:bg-[#2d5a85] sm:p-4">
                    <div className="mx-auto mb-2 h-14 w-14 overflow-hidden rounded-full border-2 border-white/10 sm:h-16 sm:w-16">
                      <PlayerAvatar player={{ name: p.name, imageUrl: p.imageUrl, position: p.position }} size={64} />
                    </div>
                    <p className="text-xs font-bold text-white truncate sm:text-sm">{p.name}</p>
                    <p className="text-[10px] text-white/[0.75] sm:text-xs">{p.position} &middot; {p.school}</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--lions-blue)] sm:text-xs">#{p.rank}</span>
                      {p.grade && <span className="text-[10px] font-semibold text-white/70 sm:text-xs">{p.grade}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard Preview */}
            {topRanked.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                    LEADERBOARD
                  </h2>
                  <Link href="/leaderboard" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">Full Rankings &rarr;</Link>
                </div>
                <div className="rounded-xl border border-[#3a6a94] bg-[#264d73] overflow-hidden">
                  {topRanked.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5 ${i !== topRanked.length - 1 ? "border-b border-white/5" : ""}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                        i === 0 ? "bg-yellow-500/20 text-yellow-400" : i === 1 ? "bg-gray-300/20 text-gray-300" : i === 2 ? "bg-orange-400/20 text-orange-400" : "bg-white/10 text-white/[0.75]"
                      }`}>{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold text-white truncate">{entry.userName}</span>
                      <span className="text-xs font-bold text-[var(--lions-blue)]">{entry.totalScore} pts</span>
                      <span className="hidden text-[10px] text-white/70 sm:block">{entry.correctExact} exact &middot; {entry.accuracyPct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Countdown */}
            <div className="rounded-xl border border-[#3a6a94] bg-[#264d73] p-6 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/[0.75] mb-2">Draft Night</p>
              <p className="text-3xl font-bold text-white">
                {Math.max(0, Math.ceil((new Date("2026-04-23T20:00:00-04:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
              </p>
              <p className="text-xs text-white/[0.75] mt-1">days to go</p>
            </div>

            {/* By The Numbers */}
            <div className="rounded-xl border border-[#3a6a94] bg-[#264d73] p-5 space-y-3">
              <h3 className="text-sm font-bold text-white/[0.75] uppercase tracking-wider">By The Numbers</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/[0.75]">Boards Published</span>
                  <span className="text-white font-semibold">{published.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/[0.75]">Prospects</span>
                  <span className="text-white font-semibold">{allPlayers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/[0.75]">Competitors</span>
                  <span className="text-white font-semibold">{leaderboard.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
