import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPropsForPool, getUserPropPicks, getPoolsForUser, getPlayers, getTeams } from "@/lib/queries";
import { PropsClient } from "./props-client";

export const dynamic = "force-dynamic";

export default async function PropsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userPools = await getPoolsForUser(session.user.id);
  if (userPools.length === 0) redirect("/");

  const poolId = userPools[0].poolId;
  const poolName = userPools[0].poolName;
  const [allProps, userPicks, allPlayers, allTeams] = await Promise.all([
    getPropsForPool(poolId),
    getUserPropPicks(session.user.id, poolId),
    getPlayers(),
    getTeams(),
  ]);

  const pickMap: Record<string, string> = {};
  for (const pick of userPicks) {
    pickMap[pick.propId] = pick.answer;
  }

  const totalPoints = allProps.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold text-white tracking-wide sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          PROP BETS
        </h1>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--lions-blue)] to-transparent" />
        <p className="mt-2 text-sm text-white/50">
          2026 NFL Draft Side Predictions &middot; {poolName}
        </p>
        <p className="mt-1 text-xs text-[var(--lions-blue)]">
          Up to {totalPoints} bonus points available
        </p>

        <div className="mt-6">
          <PropsClient
            props={allProps.map(p => ({ id: p.id, question: p.question, type: p.type, options: p.options, points: p.points, status: p.status, category: p.category, correctAnswer: p.correctAnswer }))}
            pickMap={pickMap}
            poolId={poolId}
            players={allPlayers.map(p => ({ id: p.id, name: p.name, position: p.position, school: p.school }))}
            teams={allTeams.map(t => ({ id: t.id, name: t.name, abbreviation: t.abbreviation, logoUrl: t.logoUrl }))}
          />
        </div>

        {(() => {
          const picked = Object.keys(pickMap).length;
          const total = Math.max(allProps.length, 1);
          const pct = (picked / total) * 100;
          const barColor = pct >= 100 ? "bg-emerald-400" : pct >= 67 ? "bg-emerald-400" : pct >= 34 ? "bg-[var(--lions-blue)]" : "bg-white/40";
          return (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Your picks</span>
                <span className="text-sm font-bold text-white">
                  {picked}/{allProps.length} submitted
                  {pct >= 100 && " \u2728 All picks in!"}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
