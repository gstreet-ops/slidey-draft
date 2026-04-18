import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getBoards,
  getAllPools,
  getPoolMemberCount,
  getPoolsForUser,
} from "@/lib/queries";
import { createBoard, createPool } from "@/lib/actions";
import { isDraftLocked } from "@/lib/config";
import { DraftControl } from "@/components/draft-control";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { AdminCommissionerPanel } from "@/components/admin-commissioner-panel";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  const isAdmin = session.user.role === "admin";
  const isCommissioner = session.user.role === "commissioner" || isAdmin;
  const userPools = await getPoolsForUser(session.user.id);
  const myCommissionerPools = userPools.filter(
    (p) => p.role === "commissioner" || p.role === "admin"
  );

  return (
    <div className="space-y-10">
      {/* CREATE YOUR OWN POOL — visible to all logged-in users */}
      <section className="rounded-xl border border-white/10 bg-[var(--surface-dark)] p-6 sm:p-8">
        <h2
          className="text-2xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          CREATE YOUR OWN POOL
        </h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-2xl">
          Want to run your own draft competition? Create a pool and share the
          invite link with friends. Pick which features you want — mock drafts,
          live predictions, trivia, prop bets — and you&apos;re the commissioner.
        </p>

        {myCommissionerPools.length > 0 ? (
          <div className="mt-5 space-y-3">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Pools you manage
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {myCommissionerPools.map((p) => (
                <div
                  key={p.poolId}
                  className="rounded-lg border border-white/10 bg-[var(--surface-card)] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-white truncate">{p.poolName}</h4>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      {p.role}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/pools/${p.poolId}`}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/30 hover:text-white transition"
                    >
                      View
                    </Link>
                    <Link
                      href={`/pools/${p.poolId}/settings`}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/30 hover:text-white transition"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {isCommissioner && (
              <Link
                href="/pools/create"
                className="inline-block mt-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
              >
                + Create Another Pool
              </Link>
            )}
          </div>
        ) : isCommissioner ? (
          <Link
            href="/pools/create"
            className="mt-5 inline-block rounded-lg bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
          >
            Create Pool
          </Link>
        ) : (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/70">
              Pool creation is currently limited to commissioners. Have a
              friend invite you, or ask an admin for a commissioner code.
            </p>
            <Link
              href="/commissioner"
              className="mt-3 inline-block text-sm text-[var(--accent-primary)] hover:underline"
            >
              Have a commissioner code? Redeem it →
            </Link>
          </div>
        )}
      </section>

      {isAdmin && <AdminSections />}
    </div>
  );
}

async function AdminSections() {
  const boards = await getBoards(2026);
  const allPools = await getAllPools();
  const locked = await isDraftLocked();

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
    <>
      <DraftControl isLocked={locked} />

      {/* Mock Draft Boards */}
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
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
          >
            + New Board
          </button>
        </form>

        {boards.length === 0 ? (
          <div className="rounded-xl border border-white/[0.12] bg-white/8 p-12 text-center">
            <p className="text-white/50 text-lg">No boards yet. Create your first mock draft above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/admin/board/${board.id}`}
                className="group rounded-xl border border-white/[0.12] bg-white/8 p-6 hover:border-[var(--accent-primary)]/50 hover:bg-white/10 transition"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[var(--accent-primary)] transition">
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
                <p className="mt-1 text-xs text-white/40">
                  Created {board.createdAt.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Commissioner Invites */}
      <div className="space-y-6">
        <h2
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          COMMISSIONER INVITES
        </h2>
        <AdminCommissionerPanel />
      </div>

      {/* All Pools */}
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
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
          >
            + New Pool
          </button>
        </form>

        {poolsWithCounts.length === 0 ? (
          <div className="rounded-xl border border-white/[0.12] bg-white/8 p-8 text-center">
            <p className="text-white/50">No pools yet. Create one to share invite links.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {poolsWithCounts.map((pool) => (
              <div
                key={pool.id}
                className="rounded-xl border border-white/[0.12] bg-white/8 p-6"
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
                      className="text-xs text-white/50 hover:text-white/60 transition"
                    >
                      Settings
                    </Link>
                    <Link
                      href={`/pools/${pool.id}`}
                      className="text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
                <p className="mt-1 text-sm text-white/50">
                  {pool.memberCount} member{pool.memberCount !== 1 ? "s" : ""}
                </p>
                <div className="mt-3">
                  <CopyInviteLink inviteCode={pool.inviteCode} />
                </div>
                <p className="mt-2 text-xs text-white/40">
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
          className="text-lg font-semibold text-white/50 tracking-wide uppercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          External Links
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://slidey-draft-matrix.vercel.app/roadmap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/8 px-4 py-2.5 text-sm text-white/60 hover:border-white/20 hover:text-white transition"
          >
            Feature Roadmap
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
          <a
            href="https://slidey-draft-matrix.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/8 px-4 py-2.5 text-sm text-white/60 hover:border-white/20 hover:text-white transition"
          >
            Competitive Matrix
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>
    </>
  );
}
