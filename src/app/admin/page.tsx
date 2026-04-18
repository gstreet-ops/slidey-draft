import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getBoards,
  getAllPools,
  getPoolMemberCount,
  getPoolsForUser,
  getPoolMembersWithStatus,
} from "@/lib/queries";
import { createBoard, createPool, preSeedFriend } from "@/lib/actions";
import { isDraftLocked } from "@/lib/config";
import { DraftControl } from "@/components/draft-control";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { AdminCommissionerPanel } from "@/components/admin-commissioner-panel";
import { NFL_TEAMS } from "@/lib/team-themes";
import { db } from "@/db";
import { pools, poolMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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
      <section className="rounded-xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <h2
          className="text-2xl font-bold text-[var(--text-primary)] tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          CREATE YOUR OWN POOL
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          Want to run your own draft competition? Create a pool and share the
          invite link with friends. Pick which features you want — mock drafts,
          live predictions, trivia, prop bets — and you&apos;re the commissioner.
        </p>

        {myCommissionerPools.length > 0 ? (
          <div className="mt-5 space-y-3">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Pools you manage
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {myCommissionerPools.map((p) => (
                <div
                  key={p.poolId}
                  className="rounded-lg border border-[var(--border)] bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-[var(--text-primary)] truncate">{p.poolName}</h4>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      {p.role}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/pools/${p.poolId}`}
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-white/30 hover:text-[var(--text-primary)] transition"
                    >
                      View
                    </Link>
                    <Link
                      href={`/pools/${p.poolId}/settings`}
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-white/30 hover:text-[var(--text-primary)] transition"
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
          <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-sm text-[var(--text-secondary)]">
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
  const session = await auth();
  const boards = await getBoards(2026);
  const allPools = await getAllPools();
  const locked = await isDraftLocked();

  // Find admin's primary pool (first commissioner pool, or any pool they own)
  let primaryPoolId: string | null = null;
  let primaryPoolName: string | null = null;
  if (session?.user?.id) {
    const [myPool] = await db
      .select({ id: pools.id, name: pools.name })
      .from(poolMembers)
      .innerJoin(pools, eq(poolMembers.poolId, pools.id))
      .where(
        and(
          eq(poolMembers.userId, session.user.id),
          eq(poolMembers.role, "commissioner")
        )
      )
      .limit(1);
    if (myPool) {
      primaryPoolId = myPool.id;
      primaryPoolName = myPool.name;
    } else {
      const [adminPool] = await db
        .select({ id: pools.id, name: pools.name })
        .from(pools)
        .where(eq(pools.commissionerId, session.user.id))
        .limit(1);
      if (adminPool) {
        primaryPoolId = adminPool.id;
        primaryPoolName = adminPool.name;
      }
    }
  }

  const roster = primaryPoolId
    ? await getPoolMembersWithStatus(primaryPoolId)
    : [];

  // Sorted team list for the dropdown (by city)
  const sortedTeams = Object.entries(NFL_TEAMS)
    .map(([abbr, t]) => ({ abbr, ...t }))
    .sort((a, b) => a.city.localeCompare(b.city));

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

  async function handlePreSeed(formData: FormData) {
    "use server";
    await preSeedFriend(formData);
  }

  return (
    <>
      <DraftControl isLocked={locked} />

      {/* Invite Friends — pre-seed accounts with team + default draft */}
      <div className="space-y-4">
        <h2
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          INVITE FRIENDS
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Pre-seed an account with their team and a default mock draft.
          They&apos;ll land on My Board ready to go after their first Google sign-in.
          {primaryPoolName ? (
            <> Friends will be added to <strong className="text-[var(--text-primary)]">{primaryPoolName}</strong>.</>
          ) : (
            <span className="text-yellow-700"> No pool found — create one before pre-seeding.</span>
          )}
        </p>

        {primaryPoolId && (
          <form action={handlePreSeed} className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-3 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="friend@email.com"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Favorite team</label>
                <select
                  name="team"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="" disabled>Pick a team…</option>
                  {sortedTeams.map((t) => (
                    <option key={t.abbr} value={t.abbr}>
                      {t.city} {t.name.split(" ").slice(-1)[0]} ({t.abbr})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Nickname (optional)</label>
                <input
                  name="nickname"
                  type="text"
                  placeholder="Nickname (they can change later)"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
                >
                  + Add Friend
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Roster */}
        {roster.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-light)] bg-[var(--bg-section)] text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="px-4 py-2.5 font-semibold">Member</th>
                    <th className="px-4 py-2.5 font-semibold">Team</th>
                    <th className="px-4 py-2.5 font-semibold">Draft</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Picks</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--border-light)] last:border-b-0">
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
                          {m.userName || m.userEmail}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">{m.userEmail}</p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          {m.teamLogoUrl ? (
                            <Image
                              src={m.teamLogoUrl}
                              alt={m.teamAbbreviation ?? ""}
                              width={20}
                              height={20}
                              className="h-5 w-5 object-contain shrink-0"
                            />
                          ) : (
                            <span
                              className="inline-block h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: m.teamPrimaryColor ?? "#666" }}
                            >
                              {m.teamAbbreviation ?? "?"}
                            </span>
                          )}
                          <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                            {m.teamAbbreviation ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--text-secondary)] truncate max-w-[200px]">
                        {m.boardTitle ?? "—"}
                      </td>
                      <td className="px-4 py-3 align-middle text-right text-xs font-mono">
                        <span className={m.pickCount === 32 ? "text-green-700 font-semibold" : "text-[var(--text-secondary)]"}>
                          {m.pickCount}/32
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 whitespace-nowrap ${
                            m.isPreSeeded
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {m.isPreSeeded ? "Pending" : "Joined"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {m.joinedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* Mock Draft Boards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
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
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
          >
            + New Board
          </button>
        </form>

        {boards.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
            <p className="text-[var(--text-muted)] text-lg">No boards yet. Create your first mock draft above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/admin/board/${board.id}`}
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 hover:border-[var(--accent-primary)]/50 hover:bg-gray-50 transition"
              >
                <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition">
                  {board.title}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <span>{board.season}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    board.status === "published"
                      ? "bg-green-100 text-green-700"
                      : board.status === "draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                  }`}>
                    {board.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
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
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          COMMISSIONER INVITES
        </h2>
        <AdminCommissionerPanel />
      </div>

      {/* All Pools */}
      <div className="space-y-6">
        <h2
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          POOLS
        </h2>

        <form action={handleCreatePool} className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. The Steel City Draft Club"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
          >
            + New Pool
          </button>
        </form>

        {poolsWithCounts.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
            <p className="text-[var(--text-muted)]">No pools yet. Create one to share invite links.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {poolsWithCounts.map((pool) => (
              <div
                key={pool.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{pool.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      pool.status === "open"
                        ? "bg-green-100 text-green-700"
                        : pool.status === "locked"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                    }`}>
                      {pool.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/pools/${pool.id}/settings`}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
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
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {pool.memberCount} member{pool.memberCount !== 1 ? "s" : ""}
                </p>
                <div className="mt-3">
                  <CopyInviteLink inviteCode={pool.inviteCode} />
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
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
          className="text-lg font-semibold text-[var(--text-muted)] tracking-wide uppercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          External Links
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://slidey-draft-matrix.vercel.app/roadmap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)] transition"
          >
            Feature Roadmap
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
          <a
            href="https://slidey-draft-matrix.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)] transition"
          >
            Competitive Matrix
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>
    </>
  );
}
