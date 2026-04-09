"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { PickAnnouncement } from "@/components/pick-announcement";
import { ScoreCascade } from "@/components/score-cascade";
import { ConnectionStatus } from "@/components/connection-status";
import { MobileTabBar } from "@/components/mobile-tab-bar";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl?: string | null;
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
  teamLogoUrl: string | null;
  teamPrimaryColor: string | null;
  teamAbbreviation: string | null;
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

const MOBILE_TABS = [
  { id: "picks", label: "Picks" },
  { id: "board", label: "My Board" },
  { id: "leaderboard", label: "Leaderboard" },
];

export function WarRoom({ userId, userBoardId, initialResults, draftOrder, season }: Props) {
  const { play } = useSoundEffects();
  const [announcement, setAnnouncement] = useState<ActualResult | null>(null);
  const [latestMatchType, setLatestMatchType] = useState<string | null>(null);
  const [animateScore, setAnimateScore] = useState(false);
  const [glowingRows, setGlowingRows] = useState<Map<string, "up" | "down" | "first">>(new Map());
  const prevResultCountRef = useRef(initialResults.length);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const { data: lbData, lastUpdated: lbUpdated, failCount: lbFailCount, refresh: lbRefresh } = useLiveUpdates<LeaderboardData>({
    endpoints: [`/api/leaderboard?season=${season}`],
    interval: 30_000,
    enabled: true,
  });

  const { lastUpdated: syncUpdated, failCount: syncFailCount, refresh: syncRefresh } = useLiveUpdates<{ totalPicks: number }>({
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

  const lastUpdated = lbUpdated || syncUpdated;
  const maxFailCount = Math.max(lbFailCount, syncFailCount);
  const handleRefresh = useCallback(() => { lbRefresh(); syncRefresh(); }, [lbRefresh, syncRefresh]);

  // Detect new picks
  useEffect(() => {
    if (results.length > prevResultCountRef.current) {
      const newPick = results[results.length - 1];
      if (newPick) {
        setAnnouncement(newPick);
        play("pick-announced");

        setTimeout(() => {
          const score = scoreMap.get(newPick.pickNumber);
          const matchType = score?.matchType || null;
          setLatestMatchType(matchType);
          setAnimateScore(true);

          if (matchType === "exact") {
            play("exact-match");
          } else if (matchType === "close" || matchType === "far") {
            play("tick");
          } else if (matchType === "miss") {
            play("miss");
          }
        }, 1000);
      }
    }
    prevResultCountRef.current = results.length;
  }, [results, scoreMap, play]);

  // Detect leaderboard rank changes
  useEffect(() => {
    if (leaderboard.length === 0) return;

    const newGlows = new Map<string, "up" | "down" | "first">();

    leaderboard.forEach((entry) => {
      const prevRank = prevRanksRef.current.get(entry.boardId);
      if (prevRank !== undefined) {
        if (entry.currentRank < prevRank) {
          newGlows.set(entry.boardId, entry.currentRank === 1 ? "first" : "up");
          if (entry.userId === userId) play("rank-up");
        } else if (entry.currentRank > prevRank) {
          newGlows.set(entry.boardId, "down");
        }
      }
    });

    if (newGlows.size > 0) {
      setGlowingRows(newGlows);
      setTimeout(() => setGlowingRows(new Map()), 1500);
    }

    const newRanks = new Map<string, number>();
    leaderboard.forEach((e) => newRanks.set(e.boardId, e.currentRank));
    prevRanksRef.current = newRanks;
  }, [leaderboard, userId, play]);

  const latestScore = userScores.length > 0 ? userScores[userScores.length - 1] : null;

  function getRowGlowStyle(boardId: string): React.CSSProperties | undefined {
    const glow = glowingRows.get(boardId);
    if (!glow) return undefined;
    if (glow === "first") return { animation: "row-glow-gold 1.5s ease-out" };
    if (glow === "up") return { animation: "row-glow-green 1.5s ease-out" };
    return { animation: "row-glow-red 1.5s ease-out" };
  }

  const picksColumn = (
    <div>
      <h2 className="text-lg font-bold text-white tracking-wide mb-4" style={{ fontFamily: "var(--font-display)" }}>ACTUAL PICKS</h2>
      <div className="space-y-2 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {results.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">Waiting for Round 1 to begin...</p>
        ) : (
          [...results].reverse().map((result) => (
            <div key={result.pickNumber} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                 style={result.pickNumber === results.length ? { animation: "fade-in 0.5s ease-out" } : undefined}>
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
  );

  const boardColumn = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>YOUR MOCK VS ACTUAL</h2>
        {userPicks.length > 0 && (
          <ScoreCascade
            targetScore={runningTotal}
            pointsEarned={latestScore?.pointsAwarded || 0}
            matchType={latestScore?.matchType || "miss"}
            animate={animateScore}
          />
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
              <div key={slot.pickNumber}
                   className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${matchType ? MATCH_COLORS[matchType] || "border-white/10 bg-white/5" : "border-white/10 bg-white/5"}`}
                   style={result && slot.pickNumber === results.length ? { animation: "fade-in 0.5s ease-out" } : undefined}>
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
  );

  const leaderboardColumn = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>LEADERBOARD</h2>
        <span className="text-xs text-white/40">{picksScored} of 32 picks in</span>
      </div>
      <div className="space-y-1.5 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {leaderboard.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">Scores will appear as picks come in</p>
        ) : (
          leaderboard.map((entry) => {
            const isUser = entry.userId === userId;
            const rankDelta = entry.previousRank ? entry.previousRank - entry.currentRank : 0;
            return (
              <div
                key={entry.boardId}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${isUser ? "border-[var(--slidey)]/30 bg-[var(--slidey)]/10" : "border-white/10 bg-white/5"}`}
                style={{
                  borderLeftWidth: entry.teamPrimaryColor ? 3 : undefined,
                  borderLeftColor: entry.teamPrimaryColor || undefined,
                  ...getRowGlowStyle(entry.boardId),
                }}
              >
                <span className="w-5 text-center text-sm font-bold text-white/60">{entry.currentRank}</span>
                {entry.teamLogoUrl && (
                  <img src={entry.teamLogoUrl} alt="" className="h-6 w-6 shrink-0 object-contain" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white truncate block">{entry.userName}</span>
                  <p className="text-xs text-white/30">{entry.accuracyPct?.toFixed(1)}% accuracy</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                  {rankDelta !== 0 && (
                    <p className={`text-[10px] font-medium ${rankDelta > 0 ? "text-green-400" : "text-red-400"}`}
                       style={{ animation: "fade-in 0.5s ease-out" }}>
                      {rankDelta > 0 ? `↑${rankDelta}` : `↓${Math.abs(rankDelta)}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2">
        <ConnectionStatus lastUpdated={lastUpdated} failCount={maxFailCount} onRefresh={handleRefresh} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {announcement && (
        <div className="mb-4">
          <PickAnnouncement
            pickNumber={announcement.pickNumber}
            playerName={announcement.playerName}
            playerPosition={announcement.playerPosition}
            playerSchool={announcement.playerSchool}
            teamName={announcement.teamName}
            teamAbbreviation={announcement.teamAbbreviation}
            teamPrimaryColor={announcement.teamPrimaryColor}
            matchType={latestMatchType}
            onDismiss={() => { setAnnouncement(null); setLatestMatchType(null); setAnimateScore(false); }}
          />
        </div>
      )}

      <MobileTabBar tabs={MOBILE_TABS} defaultTab="board">
        {(activeTab) => (
          <>
            {activeTab === "picks" && picksColumn}
            {activeTab === "board" && boardColumn}
            {activeTab === "leaderboard" && leaderboardColumn}
          </>
        )}
      </MobileTabBar>

      <div className="hidden lg:grid lg:grid-cols-[300px_1fr_320px] gap-6">
        {picksColumn}
        {boardColumn}
        {leaderboardColumn}
      </div>
    </div>
  );
}
