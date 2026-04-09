import Link from "next/link";
import Image from "next/image";
import { getBoards, getPoolsForUser, getPlayers, getLeaderboard, getBoardWithPicks } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { SpectatorBanner } from "@/components/spectator-banner";
import { HomeNav } from "@/components/home-nav";
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

  // Build nav links
  const navLinks = [
    { href: "/picks", label: "All Picks" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/guide", label: "How to Play" },
  ];
  if (session?.user) {
    navLinks.push({ href: "/dashboard", label: "Dashboard" });
    if (session.user.status === "active") navLinks.push({ href: "/pools", label: "Pools" });
    navLinks.push({ href: "/live", label: locked ? "War Room" : "Live" });
    navLinks.push({ href: "/my-board", label: "My Board" });
    if (session.user.role === "admin") navLinks.push({ href: "/admin", label: "Studio" });
  } else {
    navLinks.push({ href: "/login", label: "Sign In" });
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <HomeNav links={navLinks} />
      {isSpectator && <SpectatorBanner />}

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-24">
        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-[var(--lions-blue)]/10 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--lions-blue)]">2026 NFL Mock Draft</p>
          <h1
            className="text-5xl font-bold text-white tracking-wider leading-none sm:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<br /><span className="text-[var(--lions-blue)]">DRAFT</span>
          </h1>
          <p className="text-sm text-white/50 max-w-sm mx-auto sm:text-base">
            Make your picks. Compete with friends. See who knows football best.
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

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-4 sm:py-5">
          <div className="text-center">
            <p className="text-xl font-bold text-white sm:text-2xl">{published.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">Boards Published</p>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-white sm:text-2xl">{allPlayers.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">Prospects</p>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-white sm:text-2xl">{userPools.length || leaderboard.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">Competitors</p>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-[var(--lions-blue)] sm:text-2xl">{userPools.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">Pools</p>
          </div>
        </div>
      </section>

      {/* ── TOP PROSPECTS ── */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
              TOP PROSPECTS
            </h2>
            <Link href="/my-board" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">View All &rarr;</Link>
          </div>

          {/* Prospect Cards Grid */}
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
      </section>

      {/* ── FEATURED PICKS ── */}
      {featuredPicks.length > 0 && (
        <section className="border-t border-white/10 bg-white/[0.02] px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                FEATURED PICKS
              </h2>
              <Link href="/picks" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">See All Boards &rarr;</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
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
        </section>
      )}

      {/* ── LEADERBOARD PREVIEW ── */}
      {topRanked.length > 0 && (
        <section className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between mb-6">
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
        </section>
      )}

      {/* ── POOLS ── */}
      {userPools.length > 0 && (
        <section className="border-t border-white/10 bg-white/[0.02] px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white tracking-wide sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                YOUR POOLS
              </h2>
              <Link href="/pools" className="text-xs text-[var(--lions-blue)] hover:underline sm:text-sm">Manage Pools &rarr;</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {userPools.map((pool) => (
                <Link key={pool.poolId} href={`/pools/${pool.poolId}`} className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[var(--lions-blue)]/40 hover:bg-white/[0.07]">
                  <p className="text-sm font-bold text-white group-hover:text-[var(--lions-blue)] transition">{pool.poolName}</p>
                  {pool.description && <p className="mt-1 text-xs text-white/40">{pool.description}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-white/10 px-4 py-6 text-center sm:px-6">
        <p className="text-xs text-white/25">
          &copy; {new Date().getFullYear()} Slidey Draft &mdash; A GStreet Production
        </p>
      </footer>
    </div>
  );
}
