import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import {
  getBoards,
  getPoolsForUser,
  getPlayers,
  getBoardWithPicks,
  getUserBoard,
  getPoolMemberCount,
} from "@/lib/queries";
import { gradeMockDraft } from "@/lib/mock-grading";
import type { MockDraftGrade } from "@/lib/mock-grading";
import { GradeCircle } from "@/components/grade-circle";
import { db } from "@/db";
import { draftBoards } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { SpectatorBanner } from "@/components/spectator-banner";
import { InviteCodeInput } from "@/components/invite-code-input";
import { SiteFooter } from "@/components/site-footer";
import { PlayerAvatar } from "@/components/player-avatar";
import { HeroBanner, TeamStripe } from "@/components/hero-banner";
import { TeamInfoBar } from "@/components/team-info-bar";
import { getPoolSettings, DEFAULT_POOL_SETTINGS } from "@/lib/pool-settings";
import { FEATURES, getEnabledFeatures } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const locked = await isDraftLocked();
  const isSpectator = session?.user && session.user.status === "spectator";
  const isLoggedIn = !!session?.user && !isSpectator;
  const teamCode = session?.user?.favoriteTeam?.abbreviation ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {isSpectator && <SpectatorBanner />}

      <HeroBanner teamCode={teamCode} />
      <TeamStripe />
      <TeamInfoBar teamCode={teamCode} />

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

async function LoggedInDashboard({ session, locked: _locked }: { session: Session; locked: boolean }) {
  const user = session.user;
  const userId = user.id;
  const season = 2026;

  const userPools = await getPoolsForUser(userId);
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

  // Entry-draft summary for the dashboard card.
  type EntryBoard = NonNullable<Awaited<ReturnType<typeof getUserBoard>>>;
  let entryBoard: EntryBoard | null = null;
  let entryPickCount = 0;
  let entryGrade: MockDraftGrade | null = null;
  if (mockDraftEnabled) {
    entryBoard = await getUserBoard(userId, season);
    if (entryBoard) {
      const data = await getBoardWithPicks(entryBoard.id);
      entryPickCount = data?.picks.length ?? 0;
      if (data && entryPickCount > 0) {
        entryGrade = gradeMockDraft(
          data.picks.map((p) => ({
            pickNumber: p.pickNumber,
            playerGrade: p.playerGrade,
            playerRank: p.playerRank,
          }))
        );
      }
    }
  }

  // Pool snapshot counts — member + published-board totals for the first pool.
  let poolMemberTotal = 0;
  let publishedBoardsInPool = 0;
  if (inPool) {
    poolMemberTotal = await getPoolMemberCount(userPools[0].poolId);
    const [row] = await db
      .select({ c: count() })
      .from(draftBoards)
      .where(
        and(
          eq(draftBoards.season, season),
          eq(draftBoards.status, "published"),
          eq(draftBoards.isEntryDraft, true)
        )
      );
    publishedBoardsInPool = Number(row?.c ?? 0);
  }

  // Draft countdown — Round 1 opening kickoff
  const draftDate = new Date("2026-04-23T20:00:00-04:00");
  const now = new Date();
  const msUntil = draftDate.getTime() - now.getTime();
  const daysUntilDraft = Math.max(0, Math.ceil(msUntil / (1000 * 60 * 60 * 24)));
  const hoursUntilDraft = Math.max(0, Math.floor(msUntil / (1000 * 60 * 60)));
  const isDraftHere = msUntil <= 0;

  const firstName = user.name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const entryGradeLetter = entryGrade?.letterGrade ?? null;

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Welcome */}
        <div className="flex items-center gap-4">
          {user.favoriteTeam?.logoUrl && (
            <Image src={user.favoriteTeam.logoUrl} alt="" width={48} height={48} className="object-contain" />
          )}
          <div>
            <h1
              className="text-2xl font-bold text-[var(--text-primary)] tracking-wide sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Welcome back, {firstName}
            </h1>
            {user.favoriteTeam?.name && (
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-secondary)]">
                {user.favoriteTeam.name}
              </p>
            )}
          </div>
        </div>

        {/* Countdown card */}
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
            Round 1 · April 23 · 8:00 PM ET
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            {isDraftHere ? (
              <span className="text-2xl font-bold text-green-700 sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                Draft Night is HERE!
              </span>
            ) : (
              <>
                <span
                  className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {daysUntilDraft}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  day{daysUntilDraft !== 1 ? "s" : ""} to go
                  {daysUntilDraft <= 2 && hoursUntilDraft > 0 ? ` · ${hoursUntilDraft}h remaining` : ""}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mock Drafts primary CTA — the hub for building + browsing */}
        {mockDraftEnabled && (
          <Link
            href="/mock-drafts"
            className="group block rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-5 shadow-sm hover:shadow-md transition sm:p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
                  Your Entry
                </p>
                {entryBoard ? (
                  <>
                    <p className="mt-1 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                      {entryBoard.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {entryGradeLetter ? `Grade ${entryGradeLetter} · ` : ""}
                      {entryPickCount}/32 picks
                      {entryBoard.status === "published" ? " · Published" : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                    Build your mock draft
                  </p>
                )}
                <span className="mt-4 inline-block rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-bold text-[var(--accent-text)] group-hover:bg-[var(--accent-secondary)] transition">
                  {entryBoard ? "Edit & browse the pool →" : "Start drafting →"}
                </span>
              </div>
              {entryGrade && <GradeCircle grade={entryGrade.letterGrade} size="md" />}
            </div>
          </Link>
        )}

        {/* Pool snapshot */}
        {inPool && (
          <p className="text-xs text-[var(--text-muted)] text-center">
            {userPools[0].poolName} · {poolMemberTotal} member{poolMemberTotal !== 1 ? "s" : ""} ·{" "}
            {publishedBoardsInPool} draft{publishedBoardsInPool !== 1 ? "s" : ""} published
          </p>
        )}

        {/* Live CTA (when draft night is on) */}
        {inPool && liveCtaLabel ? (
          <Link
            href="/live"
            className="block rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-6 text-center shadow-sm hover:border-l-[var(--accent-secondary)] hover:shadow-md transition"
          >
            <p className="text-lg font-bold text-[var(--accent-primary)]" style={{ fontFamily: "var(--font-display)" }}>
              {liveCtaLabel}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Playing in: {userPools[0].poolName}
              {userPools.length > 1 ? ` + ${userPools.length - 1} more` : ""}
            </p>
          </Link>
        ) : !inPool ? (
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-8 text-center space-y-4 shadow-sm">
            <p className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
              JOIN A POOL TO GET STARTED
            </p>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Ask your commissioner for an invite link to join a pool and compete on draft night.
            </p>
            <InviteCodeInput />
          </div>
        ) : !hasDraftNight ? null : null}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.filter((f) => f.quickAction && f.key !== "mockDraft" && enabled.has(f.key)).map((f) => {
            const qa = f.quickAction!;
            return (
              <QuickAction key={f.key} href={qa.href} title={qa.title} desc={qa.desc} icon={qa.icon} />
            );
          })}
          <QuickAction href="/guide" title="How to Play" desc="Rules & tips" icon={"\uD83D\uDCD6"} />
        </div>
      </div>
    </main>
  );
}

function QuickAction({ href, title, desc, icon, highlight }: { href: string; title: string; desc: string; icon: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-4 shadow-sm transition ${
        highlight
          ? "border-[var(--accent-primary)]/40 bg-[var(--accent-light)] hover:border-[var(--accent-primary)]"
          : "border-gray-200 bg-white hover:border-[var(--accent-primary)]/50 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
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

  let featuredPicks: NonNullable<Awaited<ReturnType<typeof getBoardWithPicks>>>["picks"] = [];
  const publishedGrades: Array<{ boardId: string; createdBy: string | null; title: string; grade: MockDraftGrade }> = [];
  const boardDatas = await Promise.all(published.map((b) => getBoardWithPicks(b.id)));
  for (let i = 0; i < published.length; i++) {
    const b = published[i];
    const boardData = boardDatas[i];
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
      {/* ── TAGLINE + CTA (HeroBanner already rendered above) ── */}
      <section className="px-4 pt-10 pb-8 text-center sm:px-6 sm:pt-14 sm:pb-12">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="inline-block rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-text)] sm:text-xs">
            2026 NFL Draft &middot; April 23 &middot; Pittsburgh
          </div>
          <h1
            className="text-4xl font-bold text-[var(--text-primary)] tracking-wider leading-none sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            DRAFT DAY <span className="text-[var(--accent-primary)]">CHALLENGE</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto sm:text-base">
            Build a mock draft, join a pool, and score points live as Roger Goodell reads the cards.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-4">
            {locked ? (
              <Link href="/live" className="w-full rounded-lg bg-[var(--accent-primary)] px-8 py-3 text-sm font-bold text-[var(--accent-text)] shadow-md hover:bg-[var(--accent-secondary)] transition sm:w-auto">
                Watch Live
              </Link>
            ) : session?.user ? (
              <Link href="/mock-drafts" className="w-full rounded-lg bg-[var(--accent-primary)] px-8 py-3 text-sm font-bold text-[var(--accent-text)] shadow-md hover:bg-[var(--accent-secondary)] transition sm:w-auto">
                Make Your Picks
              </Link>
            ) : (
              <Link href="/login" className="w-full rounded-lg bg-[var(--accent-primary)] px-8 py-3 text-sm font-bold text-[var(--accent-text)] shadow-md hover:bg-[var(--accent-secondary)] transition sm:w-auto">
                Sign In &amp; Draft
              </Link>
            )}
            <Link href="/picks" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-8 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition sm:w-auto">
              View Mock Drafts {published.length > 0 && <span className="ml-1.5 rounded-full bg-white px-2 py-0.5 text-xs">{published.length}</span>}
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFB612]/10 text-[#FFB612] text-xl font-bold">1</div>
              <h3 className="text-sm font-bold text-gray-900">Build Your Mock Draft</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pick who you think goes where in Round 1. Predict the board before the real draft happens — the closer you are, the more bonus points you earn.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFB612]/10 text-[#FFB612] text-xl font-bold">2</div>
              <h3 className="text-sm font-bold text-gray-900">Join a Pool</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Create or join a private pool with friends. Each pool has its own leaderboard, settings, and bragging rights. Get an invite code to start.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFB612]/10 text-[#FFB612] text-xl font-bold">3</div>
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
                <Link href="/login" className="rounded-lg bg-[#FFB612] px-6 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[#FFB612]/80 transition">
                  Sign In to Get Started
                </Link>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* ── MAIN CONTENT (2-column grid) ── */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Left column */}
          <div className="space-y-8">
            {/* Mock Draft Grades — most engaging for visitors */}
            {publishedGrades.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                    MOCK DRAFT GRADES
                  </h2>
                  <Link href="/picks" className="text-xs text-[var(--steelers-gold)] hover:underline sm:text-sm">All Boards &rarr;</Link>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
                  {publishedGrades.map((entry, i) => (
                    <Link
                      key={entry.boardId}
                      href={`/picks/${entry.boardId}`}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${i !== publishedGrades.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}
                    >
                      <GradeCircle grade={entry.grade.letterGrade} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.title}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
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
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                    FEATURED PICKS
                  </h2>
                  <Link href="/picks" className="text-xs text-[var(--steelers-gold)] hover:underline sm:text-sm">See All Boards &rarr;</Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {featuredPicks.map((pick) => (
                    <div key={pick.id} className="rounded-xl border border-[var(--border)] bg-white p-3 text-center transition hover:border-[var(--border)]">
                      <div className="mb-2 flex items-center justify-center gap-1.5">
                        {pick.teamLogoUrl && (
                          <Image src={pick.teamLogoUrl} alt="" width={20} height={20} className="object-contain" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pick {pick.pickNumber}</span>
                      </div>
                      <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full border-2 sm:h-14 sm:w-14"
                        style={{ borderColor: pick.teamPrimaryColor || "rgba(255,255,255,0.1)" }}>
                        <PlayerAvatar player={{ name: pick.playerName ?? "TBD", imageUrl: pick.playerImageUrl, position: pick.playerPosition ?? "" }} size={56} />
                      </div>
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{pick.playerName ?? "TBD"}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{pick.playerPosition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Prospects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                  TOP PROSPECTS
                </h2>
                <Link href="/big-board" className="text-xs text-[var(--steelers-gold)] hover:underline sm:text-sm">View All &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {topProspects.map((p) => (
                  <div key={p.id} className="group relative rounded-xl border border-[var(--border)] bg-white p-3 text-center transition hover:border-[var(--steelers-gold)]/40 hover:bg-gray-50 sm:p-4">
                    <div className="mx-auto mb-2 h-14 w-14 overflow-hidden rounded-full border-2 border-[var(--border)] sm:h-16 sm:w-16">
                      <PlayerAvatar player={{ name: p.name, imageUrl: p.imageUrl, position: p.position }} size={64} />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate sm:text-sm">{p.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] sm:text-xs">{p.position} &middot; {p.school}</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="rounded-full bg-[var(--steelers-gold)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--steelers-gold)] sm:text-xs">#{p.rank}</span>
                      {p.grade && <span className="text-[10px] font-semibold text-[var(--text-secondary)] sm:text-xs">{p.grade}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Countdown */}
            <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Draft Night</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {Math.max(0, Math.ceil((new Date("2026-04-23T20:00:00-04:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">days to go</p>
            </div>

            {/* By The Numbers */}
            <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">By The Numbers</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Boards Published</span>
                  <span className="text-[var(--text-primary)] font-semibold">{published.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Prospects</span>
                  <span className="text-[var(--text-primary)] font-semibold">{allPlayers.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
