import Link from "next/link";
import { getBoards, getAllPools, getPoolMemberCount } from "@/lib/queries";
import { createBoard, createPool } from "@/lib/actions";
import { isDraftLocked } from "@/lib/config";
import { DraftControl } from "@/components/draft-control";
import { redirect } from "next/navigation";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { AdminCommissionerPanel } from "@/components/admin-commissioner-panel";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const boards = await getBoards(2026);
  const allPools = await getAllPools();
  const locked = await isDraftLocked();

  // Get member counts for all pools
  const poolsWithCounts = await Promise.all(
    allPools.map(async (pool) => ({
      ...pool,
      memberCount: await getPoolMemberCount(pool.id),
    }))
  );

  async function handleCreateBoard(formData: FormData) {
    "use server";
    const board = await createBoard(formData);
    redirect(`/admin/board/${board.id}`);
  }

  async function handleCreatePool(formData: FormData) {
    "use server";
    const pool = await createPool(formData);
    redirect(`/pools/${pool.id}`);
  }

  return (
    <div className="space-y-10">
      <DraftControl isLocked={locked} />

      {/* Mock Draft Boards section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-3xl font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MOCK DRAFT BOARDS
          </h1>
        </div>

        <form action={handleCreateBoard} className="flex gap-3">
          <input type="hidden" name="season" value="2026" />
          <input
            name="title"
            type="text"
            required
            placeholder="e.g. Mock Draft 1.0"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--lions-blue)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--lions-blue)]/80 transition"
          >
            + New Board
          </button>
        </form>

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

      {/* Commissioner Invites section */}
      <div className="space-y-6">
        <h2
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          COMMISSIONER INVITES
        </h2>
        <AdminCommissionerPanel />
      </div>

      {/* Pools section */}
      <div className="space-y-6">
        <h2
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          POOLS
        </h2>

        <form action={handleCreatePool} className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Georgetown Draft Club"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--gtown-highlight)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--gtown-highlight)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
          >
            + New Pool
          </button>
        </form>

        {poolsWithCounts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/50">No pools yet. Create one to share invite links.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {poolsWithCounts.map((pool) => (
              <div
                key={pool.id}
                className="rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{pool.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      pool.status === "open"
                        ? "bg-green-500/20 text-green-400"
                        : pool.status === "locked"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-white/10 text-white/50"
                    }`}>
                      {pool.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/pools/${pool.id}/settings`}
                      className="text-xs text-white/40 hover:text-white/60 transition"
                    >
                      Settings
                    </Link>
                    <Link
                      href={`/pools/${pool.id}`}
                      className="text-xs text-[var(--gtown-highlight)] hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
                <p className="mt-1 text-sm text-white/40">
                  {pool.memberCount} member{pool.memberCount !== 1 ? "s" : ""}
                </p>
                <div className="mt-3">
                  <CopyInviteLink inviteCode={pool.inviteCode} />
                </div>
                <p className="mt-2 text-xs text-white/30">
                  Created {pool.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* External Links */}
      <div className="space-y-4">
        <h2
          className="text-lg font-semibold text-white/40 tracking-wide uppercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          External Links
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://slidey-draft-matrix.vercel.app/roadmap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 hover:border-white/20 hover:text-white transition"
          >
            Feature Roadmap
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
          <a
            href="https://slidey-draft-matrix.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 hover:border-white/20 hover:text-white transition"
          >
            Competitive Matrix
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}
