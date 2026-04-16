import Link from "next/link";
import Image from "next/image";
import { getLeaderboard, getActualResults } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await auth();
  const season = 2026;
  const leaderboard = await getLeaderboard(season);
  const results = await getActualResults(season);
  const allDone = results.length >= 32;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {allDone && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-6 py-4 text-center">
            <p className="text-lg font-bold text-yellow-400">Final Results — All 32 Picks Scored</p>
          </div>
        )}

        <h1 className="text-4xl font-bold text-white tracking-wide text-center" style={{ fontFamily: "var(--font-display)" }}>LEADERBOARD</h1>
        <p className="mt-2 text-center text-white/50">{results.length}/32 picks scored &middot; 2026 NFL Draft</p>

        {leaderboard.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/[0.12] bg-white/8 p-12 text-center">
            <p className="text-white/50 text-lg">No scores yet. The leaderboard will populate once draft results are entered.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {leaderboard.map((entry) => {
              const isUser = entry.userId === session?.user?.id;
              const rank = entry.currentRank;
              const rankDelta = entry.previousRank ? entry.previousRank - rank : 0;
              const accuracyDisplay = entry.accuracyPct?.toFixed(1) || "0.0";

              return (
                <Link
                  key={entry.boardId}
                  href={`/picks/${entry.boardId}`}
                  className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 shadow-sm transition sm:gap-4 sm:px-5 sm:py-4 ${isUser ? "bg-amber-500/10 border-2 border-amber-400/30 hover:border-amber-400/50" : "bg-white/8 border border-white/[0.12] hover:bg-white/10"}`}
                  style={entry.teamPrimaryColor ? { borderLeft: `4px solid ${entry.teamPrimaryColor}` } : undefined}
                >
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${rank === 1 ? "bg-yellow-500/20 text-yellow-400" : rank === 2 ? "bg-gray-300/20 text-gray-300" : rank === 3 ? "bg-orange-400/20 text-orange-400" : "bg-white/10 text-white/50"}`}>
                      {allDone && rank === 1 ? "\uD83C\uDFC6" : rank}
                    </div>
                    {rankDelta !== 0 && (
                      <span className={`text-[10px] font-medium mt-0.5 ${rankDelta > 0 ? "text-green-600" : "text-red-500"}`}>
                        {rankDelta > 0 ? `\u2191${rankDelta}` : `\u2193${Math.abs(rankDelta)}`}
                      </span>
                    )}
                  </div>
                  {entry.teamLogoUrl && (
                    <Image src={entry.teamLogoUrl} alt={entry.teamAbbreviation || ""} width={32} height={32} className="shrink-0 object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{entry.userName}</span>
                      {isUser && <span className="rounded-full bg-[var(--gtown-highlight)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">You</span>}
                    </div>
                    <p className="text-sm text-white/50 truncate">{entry.boardTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white">{entry.totalScore}<span className="text-sm font-normal text-white/50 ml-1">pts</span></div>
                    <div className="flex flex-wrap gap-3 text-xs text-white/50">
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
