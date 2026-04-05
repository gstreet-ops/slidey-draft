import Link from "next/link";
import { getBoards } from "@/lib/queries";
import { createBoard } from "@/lib/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const boards = await getBoards(2026);

  async function handleCreateBoard(formData: FormData) {
    "use server";
    const board = await createBoard(formData);
    redirect(`/admin/board/${board.id}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MOCK DRAFT BOARDS
        </h1>
      </div>

      {/* Create new board */}
      <form action={handleCreateBoard} className="flex gap-3">
        <input type="hidden" name="season" value="2026" />
        <input
          name="title"
          type="text"
          required
          placeholder="e.g. Dan's Mock 1.0"
          className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--lions-blue)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--lions-blue)]/80 transition"
        >
          + New Board
        </button>
      </form>

      {/* Existing boards */}
      {boards.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-white/50 text-lg">No boards yet. Create your first mock draft above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/admin/board/${board.id}`}
              className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-[var(--lions-blue)]/50 hover:bg-white/10 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-[var(--lions-blue)] transition">
                {board.title}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-sm text-white/50">
                <span>{board.season}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  board.status === "published"
                    ? "bg-green-500/20 text-green-400"
                    : board.status === "draft"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-white/10 text-white/60"
                }`}>
                  {board.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/30">
                Created {board.createdAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
