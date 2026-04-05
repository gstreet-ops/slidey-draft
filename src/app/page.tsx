import Link from "next/link";
import { getBoards } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");

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
              Dan&apos;s Picks
            </Link>
            <Link href="/admin" className="text-white/60 hover:text-white transition">
              Studio
            </Link>
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
            DAN&apos;S
            <br />
            <span className="text-[var(--lions-blue)]">PICKS</span>
          </h1>
          <p className="text-lg text-white/60 max-w-md mx-auto">
            2026 NFL Mock Draft predictions from the man himself.
            One pick at a time. No algorithms. Just football instinct.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/picks"
              className="rounded-lg bg-[var(--lions-blue)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--lions-blue)]/80 transition"
            >
              View Mock Drafts
              {published.length > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {published.length}
                </span>
              )}
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition"
            >
              Open Studio
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
