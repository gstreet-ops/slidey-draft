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
  enabledFeatures,
}: {
  poolId: string;
  standings: Standing[];
  currentUserId: string;
  scoringMode?: "standard" | "custom";
  enabledFeatures?: string[];
}) {
  const [tab, setTab] = useState<"individual" | "teams">("individual");
  const enabled = new Set(enabledFeatures ?? ["mockDraft", "livePredictions", "trivia", "propBets", "watchParty"]);
  const showMock = enabled.has("mockDraft");
  const showLive = enabled.has("livePredictions");
  const showTrivia = enabled.has("trivia");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("individual")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            tab === "individual"
              ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Individual
        </button>
        <button
          onClick={() => setTab("teams")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            tab === "teams"
              ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Teams
        </button>
      </div>

      {tab === "individual" && (
        <>
          {standings.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
              <p className="text-[var(--text-muted)]">No scores yet. Standings will appear once the draft begins.</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Name</th>
                    {showMock && <th className="text-right px-4 py-3">Mock</th>}
                    {showLive && <th className="text-right px-4 py-3">Live</th>}
                    {showTrivia && <th className="text-right px-4 py-3">Trivia</th>}
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
                    const triviaTotal = ((s as Record<string, unknown>).triviaTotal as number) ?? 0;
                    const displayedTotal =
                      (showMock ? s.mockBonus : 0) +
                      (showLive ? s.liveTotal : 0) +
                      (showTrivia ? triviaTotal : 0);

                    return (
                      <tr
                        key={s.userId}
                        className={`border-b border-[var(--border-light)] last:border-0 ${
                          isMe ? "bg-[var(--steelers-gold)]/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-[var(--text-primary)] font-semibold">
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
                            <span className={isMe ? "text-[var(--steelers-gold)] font-semibold" : "text-[var(--text-primary)]"}>
                              {s.userName || s.userEmail}
                            </span>
                          </div>
                        </td>
                        {showMock && <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{s.mockBonus}</td>}
                        {showLive && <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{s.liveTotal}</td>}
                        {showTrivia && <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{triviaTotal}</td>}
                        <td className="px-4 py-3 text-right text-[var(--text-primary)] font-bold">{displayedTotal}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-muted)]">
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
