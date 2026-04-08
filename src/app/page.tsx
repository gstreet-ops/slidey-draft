import Link from "next/link";
import { getBoards, getPoolsForUser } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { isDraftLocked } from "@/lib/config";
import { SpectatorBanner } from "@/components/spectator-banner";
import { HomeNav } from "@/components/home-nav";

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

  // Build nav links
  const navLinks = [
    { href: "/picks", label: "All Picks" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];
  if (session?.user) {
    navLinks.push({ href: "/dashboard", label: "Dashboard" });
    if (session.user.status === "active") navLinks.push({ href: "/pools", label: "Pools" });
    navLinks.push({ href: "/live", label: "Live" });
    if (locked) navLinks.push({ href: "/live", label: "War Room" });
    navLinks.push({ href: "/my-board", label: "My Board" });
    if (session.user.role === "admin") navLinks.push({ href: "/admin", label: "Studio" });
  } else {
    navLinks.push({ href: "/login", label: "Sign In" });
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <HomeNav links={navLinks} />

      {isSpectator && <SpectatorBanner />}

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center sm:px-6">
        <div className="space-y-6 max-w-2xl">
          <h1
            className="text-5xl font-bold text-white tracking-wider leading-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY
            <br />
            <span className="text-[var(--lions-blue)]">DRAFT</span>
          </h1>
          <p className="text-base text-white/60 max-w-md mx-auto sm:text-lg">
            2026 NFL Mock Draft predictions. Make your picks, compete with friends,
            and see who knows football best.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {locked ? (
              <Link
                href="/live"
                className="w-full rounded-lg bg-[var(--gtown-highlight)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition sm:w-auto"
              >
                Watch Live
              </Link>
            ) : session?.user ? (
              <Link
                href="/my-board"
                className="w-full rounded-lg bg-[var(--gtown-highlight)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition sm:w-auto"
              >
                Make Your Picks
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full rounded-lg bg-[var(--gtown-highlight)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition sm:w-auto"
              >
                Sign In &amp; Make Your Picks
              </Link>
            )}
            <Link
              href="/picks"
              className="w-full rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition sm:w-auto"
            >
              View Mock Drafts
              {published.length > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {published.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </main>

      {session?.user && session.user.status === "active" && (
        <section className="border-t border-white/10 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Your Pools</h2>
              <Link
                href="/pools"
                className="text-sm text-[var(--gtown-highlight)] hover:underline"
              >
                View All
              </Link>
            </div>
            {userPools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/40 mb-4">No pools yet.</p>
                <Link
                  href="/pools/create"
                  className="rounded-lg bg-[var(--gtown-highlight)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
                >
                  Create a Pool
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {userPools.slice(0, 4).map((pool) => (
                  <Link
                    key={pool.poolId}
                    href={`/pools/${pool.poolId}`}
                    className="rounded-xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">{pool.poolName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        pool.poolStatus === "open" ? "bg-green-500/20 text-green-400"
                        : pool.poolStatus === "locked" ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-white/10 text-white/50"
                      }`}>{pool.poolStatus}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/30">
        <p>
          Built with {"\uD83E\uDD81"} by{" "}
          <a
            href="https://globestreet.com"
            className="text-[var(--lions-blue)] hover:underline"
            target="_blank"
          >
            GlobeStreet Tech
          </a>
        </p>
      </footer>
    </div>
  );
}
