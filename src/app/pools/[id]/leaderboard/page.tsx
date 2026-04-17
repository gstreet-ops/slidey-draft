import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPoolById, getPoolStandings, isPoolMember } from "@/lib/queries";
import { getPoolSettings } from "@/lib/pool-helpers";
import { getEnabledFeatures } from "@/lib/feature-flags";
import { ScoringBadge } from "@/components/scoring-badge";
import { LeaderboardTabs } from "./leaderboard-tabs";

export const dynamic = "force-dynamic";

export default async function PoolLeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const pool = await getPoolById(poolId);
  if (!pool) notFound();

  const member = await isPoolMember(poolId, session.user.id);
  if (!member) redirect("/pools");

  const standings = await getPoolStandings(poolId);

  return (
    <div className="min-h-screen bg-[var(--steelers-black)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href={`/pools/${poolId}`} className="text-white/60 hover:text-white transition">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{pool.name} Leaderboard</h1>
            <ScoringBadge mode={getPoolSettings(pool.settings).scoringMode} />
          </div>
          <p className="text-white/50 text-sm mt-1">
            {pool.status === "completed" ? "Final Standings" : "Live Standings"}
          </p>
        </div>

        <LeaderboardTabs
          poolId={poolId}
          standings={standings}
          currentUserId={session.user.id}
          scoringMode={getPoolSettings(pool.settings).scoringMode}
          enabledFeatures={Array.from(getEnabledFeatures(getPoolSettings(pool.settings)))}
        />
      </main>
    </div>
  );
}
