import Link from "next/link";
import { getBoards } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1
          className="text-4xl font-bold text-white tracking-wide text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          DAN&apos;S PICKS
        </h1>
        <p className="mt-2 text-center text-white/50">
          2026 NFL Mock Draft Boards
        </p>

        {published.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40 text-lg">No published boards yet. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {published.map((board) => (
              <Link
                key={board.id}
                href={`/picks/${board.id}`}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-[var(--lions-blue)]/50 transition"
              >
                <h2 className="text-xl font-bold text-white group-hover:text-[var(--lions-blue)] transition">
                  {board.title}
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  Published {board.publishedAt?.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
