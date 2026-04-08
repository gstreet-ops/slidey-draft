import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPoolById, getPoolStandings, isPoolMember } from "@/lib/queries";

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
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href={`/pools/${poolId}`} className="text-white/60 hover:text-white transition">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{pool.name} Leaderboard</h1>
          <p className="text-white/40 text-sm mt-1">
            {pool.status === "completed" ? "Final Standings" : "Live Standings"}
          </p>
        </div>

        {standings.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/40">No scores yet. Standings will appear once the draft begins.</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-right px-4 py-3">Mock</th>
                  <th className="text-right px-4 py-3">Live</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => {
                  const isMe = s.userId === session.user.id;
                  const rankDelta = s.previousRank && s.rank ? s.previousRank - s.rank : 0;
                  const accuracy =
                    s.picksPredicted > 0
                      ? Math.round((s.correctPredictions / s.picksPredicted) * 100)
                      : 0;

                  return (
                    <tr
                      key={s.userId}
                      className={`border-b border-white/5 last:border-0 ${
                        isMe ? "bg-[var(--gtown-highlight)]/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-white font-semibold">
                        <span className="mr-1">#{s.rank}</span>
                        {rankDelta > 0 && (
                          <span className="text-green-400 text-xs">+{rankDelta}</span>
                        )}
                        {rankDelta < 0 && (
                          <span className="text-red-400 text-xs">{rankDelta}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isMe ? "text-[var(--gtown-highlight)] font-semibold" : "text-white"}>
                          {s.userName || s.userEmail}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/60">{s.mockBonus}</td>
                      <td className="px-4 py-3 text-right text-white/60">{s.liveTotal}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{s.combinedScore}</td>
                      <td className="px-4 py-3 text-right text-white/40">
                        {s.picksPredicted > 0 ? `${accuracy}%` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
