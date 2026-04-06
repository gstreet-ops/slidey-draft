import Link from "next/link";
import { getBoards } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");
  const session = await auth();

  // Enrich boards with creator info
  const enrichedBoards = await Promise.all(
    published.map(async (board) => {
      if (!board.createdBy) return { ...board, creator: null };
      const [creator] = await db
        .select({ name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, board.createdBy));
      return { ...board, creator: creator || null };
    })
  );

  // Separate admin boards (Dan's) from player boards
  const adminBoards = enrichedBoards.filter((b) => b.creator?.role === "admin");
  const playerBoards = enrichedBoards.filter((b) => b.creator?.role !== "admin");

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-2xl font-bold text-white tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm text-white/60">
            {session?.user ? (
              <Link href="/my-board" className="hover:text-white transition">
                My Board
              </Link>
            ) : (
              <Link href="/login" className="hover:text-white transition">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1
          className="text-4xl font-bold text-white tracking-wide text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MOCK DRAFTS
        </h1>
        <p className="mt-2 text-center text-white/50">
          2026 NFL Mock Draft Boards
        </p>

        {/* Dan's featured boards */}
        {adminBoards.length > 0 && (
          <div className="mt-8 space-y-4">
            {adminBoards.map((board) => (
              <Link
                key={board.id}
                href={`/picks/${board.id}`}
                className="group block rounded-xl border-2 border-[var(--lions-blue)]/30 bg-gradient-to-r from-[#0076B6]/10 to-[#B0B7BC]/5 p-6 hover:border-[var(--lions-blue)]/60 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--lions-blue)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Featured Analyst
                  </span>
                  <span className="text-xs text-[var(--lions-silver)]">
                    {board.creator?.name || board.creator?.email}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-white group-hover:text-[var(--lions-blue)] transition">
                  {board.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--lions-silver)]">
                  Published {board.publishedAt?.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* Player boards */}
        {playerBoards.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {playerBoards.map((board) => (
              <Link
                key={board.id}
                href={`/picks/${board.id}`}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-[var(--gtown-highlight)]/50 transition"
              >
                <h2 className="text-xl font-bold text-white group-hover:text-[var(--gtown-highlight)] transition">
                  {board.title}
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  {board.creator?.name || board.creator?.email || "Anonymous"} &middot;
                  Published {board.publishedAt?.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}

        {published.length === 0 && (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40 text-lg">No published boards yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
