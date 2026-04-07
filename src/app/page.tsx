import Link from "next/link";
import { getBoards } from "@/lib/queries";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      {/* Nav */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span
            className="text-2xl font-bold text-white tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </span>
          <nav className="flex gap-4 text-sm">
            <Link href="/picks" className="text-white/60 hover:text-white transition">
              All Picks
            </Link>
            <Link href="/leaderboard" className="text-white/60 hover:text-white transition">
              Leaderboard
            </Link>
            {session?.user ? (
              <>
                <Link href="/dashboard" className="text-white/60 hover:text-white transition">
                  Dashboard
                </Link>
                <Link href="/live" className="text-white/60 hover:text-white transition">
                  Live
                </Link>
                <Link href="/my-board" className="text-white/60 hover:text-white transition">
                  My Board
                </Link>
                {(session.user as any).role === "admin" && (
                  <Link href="/admin" className="text-white/60 hover:text-white transition">
                    Studio
                  </Link>
                )}
              </>
            ) : (
              <Link href="/login" className="text-white/60 hover:text-white transition">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-6 max-w-2xl">
          <h1
            className="text-6xl font-bold text-white tracking-wider leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY
            <br />
            <span className="text-[var(--lions-blue)]">DRAFT</span>
          </h1>
          <p className="text-lg text-white/60 max-w-md mx-auto">
            2026 NFL Mock Draft predictions. Make your picks, compete with friends,
            and see who knows football best.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {session?.user ? (
              <Link
                href="/my-board"
                className="rounded-lg bg-[var(--gtown-highlight)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
              >
                Make Your Picks
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-[var(--gtown-highlight)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
              >
                Sign In &amp; Make Your Picks
              </Link>
            )}
            <Link
              href="/picks"
              className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition"
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

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/30">
        <p>
          Built with 🦁 by{" "}
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
