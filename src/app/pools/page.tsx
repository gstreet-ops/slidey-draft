import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPoolsForUser } from "@/lib/queries";
import { JoinPoolForm } from "./join-pool-form";
import { SiteFooter } from "@/components/site-footer";
import { getPoolSettings } from "@/lib/pool-helpers";
import { ScoringBadge } from "@/components/scoring-badge";

export const dynamic = "force-dynamic";

export default async function PoolsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.status !== "active") redirect("/");

  const pools = await getPoolsForUser(session.user.id);

  return (
    <div className="min-h-screen bg-[var(--steelers-black)] flex flex-col">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Your Pools</h1>
          {(session.user.role === "commissioner" || session.user.role === "admin") && (
            <Link
              href="/pools/create"
              className="rounded-lg bg-[var(--steelers-gold)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition"
            >
              Create Pool
            </Link>
          )}
        </div>

        {/* Join pool */}
        <JoinPoolForm />

        {/* Pool list */}
        {pools.length === 0 ? (
          <div className="rounded-xl bg-[var(--bg-card)] p-12 text-center space-y-4">
            <p className="text-[var(--text-secondary)]">You haven&apos;t joined any pools yet.</p>
            <p className="text-[var(--text-muted)] text-sm">Create a pool or join one with an invite code.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pools.map((pool) => (
              <Link
                key={pool.poolId}
                href={`/pools/${pool.poolId}`}
                className="rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-6 hover:bg-gray-50 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{pool.poolName}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      pool.poolStatus === "open"
                        ? "bg-green-100 text-green-700"
                        : pool.poolStatus === "locked"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                    }`}
                  >
                    {pool.poolStatus}
                  </span>
                </div>
                {pool.description && (
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2">{pool.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="capitalize">{pool.role}</span>
                  <ScoringBadge mode={getPoolSettings(pool.settings).scoringMode} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
