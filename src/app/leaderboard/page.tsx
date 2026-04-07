import Link from "next/link";
import { getLeaderboard, getActualResults } from "@/lib/queries";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await auth();
  const season = 2026;
  const leaderboard = await getLeaderboard(season);
  const results = await getActualResults(season);
  const allDone = results.length >= 32;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm text-white/60">
            <Link href="/picks" className="hover:text-white transition">All Picks</Link>
            <Link href="/live" className="hover:text-white transition">War Room</Link>
            {session?.user ? (
              <Link href="/my-board" className="hover:text-white transition">My Board</Link>
            ) : (
              <Link href="/login" className="hover:text-white transition">Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {allDone && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-6 py-4 text-center">
            <p className="text-lg font-bold text-yellow-400">Final Results — All 32 Picks Scored</p>
          </div>
        )}

        <h1 className="text-4xl font-bold text-white tracking-wide text-center" style={{ fontFamily: "var(--font-display)" }}>LEADERBOARD</h1>
        <p className="mt-2 text-center text-white/50">{results.length}/32 picks scored &middot; 2026 NFL Draft</p>

        {leaderboard.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40 text-lg">No scores yet. The leaderboard will populate once draft results are entered.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {leaderboard.map((entry) => {
              const isAdmin = entry.userRole === "admin";
              const isUser = entry.userId === session?.user?.id;
              const rank = entry.currentRank;
              const rankDelta = entry.previousRank ? entry.previousRank - rank : 0;
              const accuracyDisplay = entry.accuracyPct?.toFixed(1) || "0.0";

              return (
                <Link key={entry.boardId} href={`/picks/${entry.boardId}`} className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition hover:border-white/20 ${isAdmin ? "border-[var(--lions-blue)]/30 bg-gradient-to-r from-[#0076B6]/10 to-[#B0B7BC]/5" : isUser ? "border-[var(--gtown-highlight)]/30 bg-[var(--gtown-highlight)]/5" : "border-white/10 bg-white/5"}`}>
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${rank === 1 ? "bg-yellow-500/20 text-yellow-400" : rank === 2 ? "bg-gray-400/20 text-gray-300" : rank === 3 ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/40"}`}>
                      {allDone && rank === 1 ? "🏆" : rank}
                    </div>
                    {rankDelta !== 0 && (
                      <span className={`text-[10px] font-medium mt-0.5 ${rankDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                        {rankDelta > 0 ? `↑${rankDelta}` : `↓${Math.abs(rankDelta)}`}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{entry.userName}</span>
                      {isAdmin && <span className="rounded-full bg-[var(--lions-blue)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Featured Analyst</span>}
                      {isUser && <span className="rounded-full bg-[var(--gtown-highlight)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">You</span>}
                    </div>
                    <p className="text-sm text-white/40 truncate">{entry.boardTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white">{entry.totalScore}<span className="text-sm font-normal text-white/40 ml-1">pts</span></div>
                    <div className="flex gap-3 text-xs text-white/40">
                      <span>{entry.correctExact} exact</span>
                      <span>{entry.correctPlayer} correct</span>
                      <span>{accuracyDisplay}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
