"use client";

import { useState } from "react";
import { TeamLeaderboard } from "@/components/team-leaderboard";

interface Standing {
  userId: string;
  userName: string | null;
  userEmail: string;
  teamLogoUrl: string | null;
  mockBonus: number;
  liveTotal: number;
  combinedScore: number;
  rank: number | null;
  previousRank: number | null;
  picksPredicted: number;
  correctPredictions: number;
  [key: string]: unknown;
}

export function LeaderboardTabs({
  poolId,
  standings,
  currentUserId,
  scoringMode = "standard",
}: {
  poolId: string;
  standings: Standing[];
  currentUserId: string;
  scoringMode?: "standard" | "custom";
}) {
  const [tab, setTab] = useState<"individual" | "teams">("individual");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("individual")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            tab === "individual"
              ? "bg-[var(--gtown-highlight)] text-white"
              : "text-white/50 hover:text-white/60"
          }`}
        >
          Individual
        </button>
        <button
          onClick={() => setTab("teams")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            tab === "teams"
              ? "bg-[var(--gtown-highlight)] text-white"
              : "text-white/50 hover:text-white/60"
          }`}
        >
          Teams
        </button>
      </div>

      {tab === "individual" && (
        <>
          {standings.length === 0 ? (
            <div className="bg-white/8 border border-white/[0.12] rounded-xl p-12 text-center">
              <p className="text-white/50">No scores yet. Standings will appear once the draft begins.</p>
            </div>
          ) : (
            <div className="bg-white/8 border border-white/[0.12] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-right px-4 py-3">Mock</th>
                    <th className="text-right px-4 py-3">Live</th>
                    <th className="text-right px-4 py-3">Trivia</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-right px-4 py-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => {
                    const isMe = s.userId === currentUserId;
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
                          <div className="flex items-center gap-2">
                            {s.teamLogoUrl && (
                              <img src={s.teamLogoUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                            )}
                            <span className={isMe ? "text-[var(--gtown-highlight)] font-semibold" : "text-white"}>
                              {s.userName || s.userEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white/60">{s.mockBonus}</td>
                        <td className="px-4 py-3 text-right text-white/60">{s.liveTotal}</td>
                        <td className="px-4 py-3 text-right text-white/60">{(s as Record<string, unknown>).triviaTotal as number ?? 0}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{s.combinedScore}</td>
                        <td className="px-4 py-3 text-right text-white/50">
                          {s.picksPredicted > 0 ? `${accuracy}%` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "teams" && (
        <TeamLeaderboard
          poolId={poolId}
          standings={standings.map((s) => ({
            userId: s.userId,
            combinedScore: s.combinedScore,
          }))}
        />
      )}
    </div>
  );
}
