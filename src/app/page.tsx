import Link from "next/link";
import Image from "next/image";
import { getBoards, getPoolsForUser, getPlayers, getLeaderboard, getBoardWithPicks } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { SpectatorBanner } from "@/components/spectator-banner";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PlayerAvatar } from "@/components/player-avatar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");
  const session = await auth();
  const locked = await isDraftLocked();
  const isSpectator = session?.user && session.user.status === "spectator";
  const userPools = session?.user?.id && session.user.status === "active"
    ? await getPoolsForUser(session.user.id)
    : [];

  // Fetch extra data for the landing page
  const allPlayers = await getPlayers();
  const topProspects = allPlayers.filter((p) => p.rank).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 8);
  const leaderboard = await getLeaderboard(2026);
  const topRanked = leaderboard.slice(0, 5);

  // Get featured picks from the first published board
  let featuredPicks: NonNullable<Awaited<ReturnType<typeof getBoardWithPicks>>>["picks"] = [];
  if (published.length > 0) {
    const board = await getBoardWithPicks(published[0].id);
    if (board) featuredPicks = board.picks.slice(0, 6);
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <SiteNav
        isLoggedIn={!!session?.user}
        isAdmin={session?.user?.role === "admin"}
        isLocked={locked}
        userInitial={session?.user?.name?.[0]?.toUpperCase()}
        teamLogoUrl={session?.user?.favoriteTeam?.logoUrl}
        teamName={session?.user?.favoriteTeam?.name}
      />
      {isSpectator && <SpectatorBanner />}

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-24">
        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-[var(--lions-blue)]/10 blur-[120px]" />
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
          <p className="text-sm text-white/50 max-w-md mx-auto sm:text-base">
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
                ? "You're browsing as a spectator. Enter an invite code to create mock drafts, join pools, and compete on draft night."
                : "Sign in and enter an invite code to start competing. Ask a friend who's already playing, or request one from the commissioner."}
            </p>
            {isSpectator ? (
              <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
                <Link href="/settings" className="rounded-lg bg-[#0076B6] px-6 py-3 text-sm font-bold text-white hover:bg-[#0076B6]/80 transition">
                  Enter Invite Code
                </Link>
              </div>
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
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Left column */}
          <div className="space-y-8">
            {/* Dan's Picks / Featured Picks */}
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
                    <div key={pick.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-white/20">
                      <div className="mb-2 flex items-center justify-center gap-1.5">
                        {pick.teamLogoUrl && (
                          <Image src={pick.teamLogoUrl} alt="" width={20} height={20} className="object-contain" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Pick {pick.pickNumber}</span>
                      </div>
                      <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full border-2 sm:h-14 sm:w-14"
                        style={{ borderColor: pick.teamPrimaryColor || "rgba(255,255,255,0.1)" }}>
                        <PlayerAvatar player={{ name: pick.playerName ?? "TBD", imageUrl: pick.playerImageUrl, position: pick.playerPosition ?? "" }} size={56} />
                      </div>
                      <p className="text-xs font-bold text-white truncate">{pick.playerName ?? "TBD"}</p>
                      <p className="text-[10px] text-white/40">{pick.playerPosition}</p>
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
                  <div key={p.id} className="group relative rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-[var(--lions-blue)]/40 hover:bg-white/[0.07] sm:p-4">
                    <div className="mx-auto mb-2 h-14 w-14 overflow-hidden rounded-full border-2 border-white/10 sm:h-16 sm:w-16">
                      <PlayerAvatar player={{ name: p.name, imageUrl: p.imageUrl, position: p.position }} size={64} />
                    </div>
                    <p className="text-xs font-bold text-white truncate sm:text-sm">{p.name}</p>
                    <p className="text-[10px] text-white/40 sm:text-xs">{p.position} &middot; {p.school}</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--lions-blue)] sm:text-xs">#{p.rank}</span>
                      {p.grade && <span className="text-[10px] font-semibold text-white/30 sm:text-xs">{p.grade}</span>}
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
                <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
                  {topRanked.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5 ${i !== topRanked.length - 1 ? "border-b border-white/5" : ""}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                        i === 0 ? "bg-yellow-500/20 text-yellow-400" : i === 1 ? "bg-gray-300/20 text-gray-300" : i === 2 ? "bg-orange-400/20 text-orange-400" : "bg-white/10 text-white/40"
                      }`}>{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold text-white truncate">{entry.userName}</span>
                      <span className="text-xs font-bold text-[var(--lions-blue)]">{entry.totalScore} pts</span>
                      <span className="hidden text-[10px] text-white/30 sm:block">{entry.correctExact} exact &middot; {entry.accuracyPct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Countdown */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Draft Night</p>
              <p className="text-3xl font-bold text-white">
                {Math.max(0, Math.ceil((new Date("2026-04-23T20:00:00-04:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
              </p>
              <p className="text-xs text-white/40 mt-1">days to go</p>
            </div>

            {/* Your Pools */}
            {userPools.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Your Pools</h3>
                  <Link href="/pools" className="text-[10px] text-[var(--lions-blue)] hover:underline">Manage &rarr;</Link>
                </div>
                <div className="space-y-2">
                  {userPools.map((pool) => (
                    <Link key={pool.poolId} href={`/pools/${pool.poolId}`} className="block rounded-lg bg-white/5 px-3 py-2 hover:bg-white/10 transition">
                      <p className="text-sm font-semibold text-white truncate">{pool.poolName}</p>
                      {pool.description && <p className="text-[10px] text-white/30 truncate">{pool.description}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* By The Numbers */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">By The Numbers</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Boards Published</span>
                  <span className="text-white font-semibold">{published.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Prospects</span>
                  <span className="text-white font-semibold">{allPlayers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Competitors</span>
                  <span className="text-white font-semibold">{leaderboard.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Pools</span>
                  <span className="text-[var(--lions-blue)] font-semibold">{userPools.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter isAdmin={session?.user?.role === "admin"} />
    </div>
  );
}
