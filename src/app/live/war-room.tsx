"use client";

import { useLiveUpdates } from "@/hooks/use-live-updates";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
};

type ActualResult = {
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
};

type LeaderboardEntry = {
  boardId: string;
  totalScore: number;
  correctExact: number;
  accuracyPct: number;
  previousRank: number | null;
  currentRank: number;
  userName: string;
  userRole: string;
  userId: string | null;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  picksScored: number;
};

type BoardPick = {
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  autoFilled: boolean;
};

type PickScore = {
  pickNumber: number;
  pointsAwarded: number;
  matchType: string;
};

type Props = {
  userId: string | null;
  userBoardId: string | null;
  initialResults: ActualResult[];
  draftOrder: DraftSlot[];
  season: number;
};

const MATCH_COLORS: Record<string, string> = {
  exact: "border-green-500/40 bg-green-500/10",
  close: "border-yellow-500/40 bg-yellow-500/10",
  far: "border-orange-500/40 bg-orange-500/10",
  miss: "border-red-500/40 bg-red-500/10",
};

const MATCH_LABELS: Record<string, string> = {
  exact: "+10",
  close: "+5",
  far: "+3",
  miss: "0",
};

export function WarRoom({ userId, userBoardId, initialResults, draftOrder, season }: Props) {
  const { data: lbData } = useLiveUpdates<LeaderboardData>({
    endpoints: [`/api/leaderboard?season=${season}`],
    interval: 30_000,
    enabled: true,
  });

  const { lastUpdated } = useLiveUpdates<{ totalPicks: number }>({
    endpoints: ["/api/draft/sync"],
    interval: 30_000,
    enabled: true,
    method: "POST",
  });

  const { data: boardData } = useLiveUpdates<{ picks: BoardPick[]; scores: PickScore[] } | null>({
    endpoints: userBoardId ? [`/api/board/${userBoardId}/live`] : [],
    interval: 30_000,
    enabled: !!userBoardId,
  });

  const { data: resultsData } = useLiveUpdates<ActualResult[]>({
    endpoints: [`/api/draft/results?season=${season}`],
    interval: 30_000,
    enabled: true,
  });

  const results = resultsData || initialResults;
  const leaderboard = lbData?.leaderboard || [];
  const picksScored = lbData?.picksScored || results.length;
  const userPicks = boardData?.picks || [];
  const userScores = boardData?.scores || [];

  const pickMap = new Map(userPicks.map((p) => [p.pickNumber, p]));
  const scoreMap = new Map(userScores.map((s) => [s.pickNumber, s]));
  const resultMap = new Map(results.map((r) => [r.pickNumber, r]));
  const runningTotal = userScores.reduce((sum, s) => sum + s.pointsAwarded, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="flex flex-col lg:grid lg:grid-cols-[300px_1fr_320px] gap-6">

        {/* LEFT: Actual Picks Feed */}
        <div className="order-3 lg:order-1">
          <h2 className="text-lg font-bold text-white tracking-wide mb-4" style={{ fontFamily: "var(--font-display)" }}>ACTUAL PICKS</h2>
          <div className="space-y-2 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {results.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">Waiting for Round 1 to begin...</p>
            ) : (
              [...results].reverse().map((result) => (
                <div key={result.pickNumber} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: result.teamPrimaryColor || "#333" }}>
                    {result.pickNumber}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{result.playerName}</p>
                    <p className="text-xs text-white/40">{result.playerPosition} &middot; {result.playerSchool} &middot; {result.teamAbbreviation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER: Your Mock vs Actual */}
        <div className="order-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>YOUR MOCK VS ACTUAL</h2>
            {userPicks.length > 0 && (
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{runningTotal}</span>
                <span className="text-sm text-white/40 ml-1">pts</span>
              </div>
            )}
          </div>

          {!userBoardId ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-white/40">You don&apos;t have a mock draft to score.</p>
            </div>
          ) : (
            <div className="space-y-1.5 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {draftOrder.map((slot) => {
                const pick = pickMap.get(slot.pickNumber);
                const score = scoreMap.get(slot.pickNumber);
                const result = resultMap.get(slot.pickNumber);
                const matchType = score?.matchType || (result ? "miss" : null);

                return (
                  <div key={slot.pickNumber} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${matchType ? MATCH_COLORS[matchType] || "border-white/10 bg-white/5" : "border-white/10 bg-white/5"}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}>{slot.pickNumber}</div>
                    <div className="flex-1 min-w-0">
                      {pick ? (
                        <p className={`text-sm text-white/80 truncate ${pick.autoFilled ? "italic" : ""}`}>
                          {pick.playerName}
                          <span className="text-xs text-white/40 ml-1">{pick.playerPosition}</span>
                          {pick.autoFilled && <span className="ml-1 text-[9px] text-yellow-400/70 font-medium">BPA</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-white/20">&mdash;</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      {result ? (
                        <p className="text-sm text-white/80 truncate">
                          {result.playerName}
                          <span className="text-xs text-white/40 ml-1">{result.playerPosition}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-white/20">pending</p>
                      )}
                    </div>
                    <div className="w-10 shrink-0 text-right">
                      {matchType && (
                        <span className={`text-xs font-bold whitespace-nowrap ${matchType === "exact" ? "text-green-400" : matchType === "close" ? "text-yellow-400" : matchType === "far" ? "text-orange-400" : "text-red-400"}`}>
                          {MATCH_LABELS[matchType]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Live Leaderboard */}
        <div className="order-1 lg:order-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>LEADERBOARD</h2>
            <span className="text-xs text-white/40">{picksScored} of 32 picks in</span>
          </div>
          <div className="space-y-1.5 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">Scores will appear as picks come in</p>
            ) : (
              leaderboard.map((entry) => {
                const isAdmin = entry.userRole === "admin";
                const isUser = entry.userId === userId;
                const rankDelta = entry.previousRank ? entry.previousRank - entry.currentRank : 0;
                return (
                  <div key={entry.boardId} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${isAdmin ? "border-[var(--lions-blue)]/30 bg-[#0076B6]/10" : isUser ? "border-[var(--gtown-highlight)]/30 bg-[var(--gtown-highlight)]/10" : "border-white/10 bg-white/5"}`}>
                    <span className="w-6 text-center text-sm font-bold text-white/60">{entry.currentRank}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">{entry.userName}</span>
                        {isAdmin && <span className="text-[8px] text-[var(--lions-blue)] font-bold uppercase">Dan</span>}
                      </div>
                      <p className="text-xs text-white/30">{entry.accuracyPct?.toFixed(1)}% accuracy</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                      {rankDelta !== 0 && (
                        <p className={`text-[10px] font-medium ${rankDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                          {rankDelta > 0 ? `↑${rankDelta}` : `↓${Math.abs(rankDelta)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {lastUpdated && (
            <p className="mt-2 text-[10px] text-white/20 text-center">Updated {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
