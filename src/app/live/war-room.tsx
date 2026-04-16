"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { PickAnnouncement } from "@/components/pick-announcement";
import { ScoreCascade } from "@/components/score-cascade";
import { ConnectionStatus } from "@/components/connection-status";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { OnTheClock } from "@/components/on-the-clock";
import { TeamLeaderboard } from "@/components/team-leaderboard";
import { PoolChat } from "@/components/pool-chat";
import { TriviaCard } from "@/components/trivia-card";
import { CollapsibleTriviaControls } from "@/components/collapsible-trivia-controls";
import { CollapsibleSimControls } from "@/components/collapsible-sim-controls";
import { CollapsibleScoringSettings } from "@/components/collapsible-scoring-settings";
import { CollapsibleVideoSettings } from "@/components/collapsible-video-settings";

type PickContextEntry = {
  userName: string;
  matchType: string | null;
  pointsAwarded: number | null;
};

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

type PoolContext = {
  poolId: string;
  poolName: string;
  commissionerId: string;
  isCommissioner: boolean;
  triviaTimerSeconds: number;
  watchPartyEnabled: boolean;
  videoCallUrl: string | null;
  scoringConfig: {
    scoringMode: "standard" | "custom";
    mockPointValues: { playerCalled: number; rangeClose: number; rangeFar: number; exactSlot: number; positionMatch: number };
    livePointValues: { correctPlayer: number };
    triviaPointValues: { easy: number; medium: number; hard: number };
  };
};

type Props = {
  userId: string | null;
  userBoardId: string | null;
  initialResults: ActualResult[];
  draftOrder: DraftSlot[];
  season: number;
  poolContexts: PoolContext[];
  isSpectator?: boolean;
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

export function WarRoom({ userId, userBoardId, initialResults, draftOrder, season, poolContexts, isSpectator }: Props) {
  const { play } = useSoundEffects();
  const [selectedPoolIdx, setSelectedPoolIdx] = useState(0);
  const pool = poolContexts[selectedPoolIdx] ?? poolContexts[0] ?? null;
  const poolId = pool?.poolId ?? null;
  const [announcement, setAnnouncement] = useState<ActualResult | null>(null);
  const [latestMatchType, setLatestMatchType] = useState<string | null>(null);
  const [announcementContext, setAnnouncementContext] = useState<PickContextEntry[]>([]);
  const [previousPickContext, setPreviousPickContext] = useState<PickContextEntry[]>([]);
  const [animateScore, setAnimateScore] = useState(false);
  const [glowingRows, setGlowingRows] = useState<Map<string, "up" | "down" | "first">>(new Map());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPos, setChatPos] = useState({ x: 0, y: 0 });
  const [systemEvents, setSystemEvents] = useState<{ id: string; type: "system"; content: string; createdAt: string }[]>([]); // offset from default bottom-right
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
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

        // Inject system event into live feed
        setSystemEvents((prev) => [...prev, {
          id: `pick-${newPick.pickNumber}`,
          type: "system",
          content: `\uD83C\uDFC8 Pick #${newPick.pickNumber}: ${newPick.playerName} (${newPick.playerPosition}) \u2192 ${newPick.teamAbbreviation}`,
          createdAt: new Date().toISOString(),
        }]);

        setTimeout(() => {
          const score = scoreMap.get(newPick.pickNumber);
          const matchType = score?.matchType || null;
          setLatestMatchType(matchType);
          setAnimateScore(true);

          if (matchType === "exact") play("exact-match");
          else if (matchType === "close" || matchType === "far") play("tick");
          else if (matchType === "miss") play("miss");

          fetch(`/api/draft/pick-context?pickNumber=${newPick.pickNumber}&season=${season}`)
            .then(r => r.json())
            .then(data => {
              const ctx = data.context || [];
              setAnnouncementContext(ctx);
              setPreviousPickContext(ctx);
            })
            .catch(() => {});
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

  const showChat = poolId && userId;

  // ── Column 1: Your Picks vs Actual ──
  const picksColumn = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>YOUR PICKS VS ACTUAL</h2>
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
        <div className="rounded-xl border border-white/[0.12] bg-white/8 p-8 text-center">
          <p className="text-white/50 text-sm">You don&apos;t have a mock draft to score.</p>
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
                   className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${matchType ? MATCH_COLORS[matchType] || "border-white/[0.12] bg-white/8" : "border-white/[0.12] bg-white/8"}`}
                   style={result && slot.pickNumber === results.length ? { animation: "fade-in 0.5s ease-out" } : undefined}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}>{slot.pickNumber}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-[var(--slidey)]/70 uppercase tracking-widest mb-0.5">You</p>
                  {pick ? (
                    <p className={`text-sm text-white truncate ${pick.autoFilled ? "italic" : ""}`}>
                      {pick.playerName}
                      <span className="text-xs text-white/50 ml-1">{pick.playerPosition}</span>
                      {pick.autoFilled && <span className="ml-1 text-[9px] text-yellow-400/70 font-medium">BPA</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-white/20">&mdash;</p>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Actual</p>
                  {result ? (
                    <p className="text-sm text-white/60 truncate">
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

  // ── Column 2: Trivia + Commissioner Controls ──
  const triviaColumn = (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>TRIVIA</h2>

      {poolId && <TriviaCard key={`trivia-${poolId}`} poolId={poolId} />}

      {pool?.isCommissioner && poolId && (
        <CollapsibleTriviaControls key={`tctl-${poolId}`} poolId={poolId} triviaTimerSeconds={pool.triviaTimerSeconds} />
      )}

      {pool?.isCommissioner && (
        <CollapsibleSimControls />
      )}

      {pool?.isCommissioner && poolId && (
        <CollapsibleScoringSettings key={`score-${poolId}`} poolId={poolId} initialConfig={pool.scoringConfig} />
      )}

      {pool?.isCommissioner && poolId && (
        <CollapsibleVideoSettings key={`video-${poolId}`} poolId={poolId} initialUrl={pool.videoCallUrl} />
      )}
    </div>
  );

  // ── Column 3: Leaderboard ──
  const leaderboardColumn = (
    <div>
      {poolId && (
        <div className="mb-4">
          <TeamLeaderboard
            poolId={poolId}
            standings={leaderboard.map((e) => ({ userId: e.userId || "", combinedScore: e.totalScore }))}
          />
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>LEADERBOARD</h2>
        <span className="text-xs text-white/50">{picksScored} of 32 picks in</span>
      </div>
      <div className="space-y-1.5 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {leaderboard.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">Scores will appear as picks come in</p>
        ) : (
          leaderboard.map((entry) => {
            const isUser = entry.userId === userId;
            const rankDelta = entry.previousRank ? entry.previousRank - entry.currentRank : 0;
            return (
              <div
                key={entry.boardId}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${isUser ? "border-[var(--slidey)]/30 bg-[var(--slidey)]/10" : "border-white/[0.12] bg-white/8"}`}
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
                  <p className="text-xs text-white/40">{entry.accuracyPct?.toFixed(1)}% accuracy</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                  {rankDelta !== 0 && (
                    <p className={`text-[10px] font-medium ${rankDelta > 0 ? "text-green-400" : "text-red-400"}`}
                       style={{ animation: "fade-in 0.5s ease-out" }}>
                      {rankDelta > 0 ? `\u2191${rankDelta}` : `\u2193${Math.abs(rankDelta)}`}
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

  const mobileTabs = [
    { id: "picks", label: "Picks" },
    { id: "trivia", label: "Trivia" },
    { id: "leaderboard", label: "Leaderboard" },
    ...(showChat ? [{ id: "chat", label: "Live Feed" }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/* Pool context bar */}
      {pool && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-white/50">Playing in:</span>
          {poolContexts.length > 1 ? (
            <select
              value={selectedPoolIdx}
              onChange={(e) => setSelectedPoolIdx(Number(e.target.value))}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white focus:border-[var(--lions-blue)] focus:outline-none"
            >
              {poolContexts.map((p, i) => (
                <option key={p.poolId} value={i} className="bg-gray-900">{p.poolName}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold text-white">{pool.poolName}</span>
          )}
          {pool.isCommissioner && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">Commissioner</span>
          )}
          {/* Video call button */}
          {pool.videoCallUrl && (
            <a
              href={pool.videoCallUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-500 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              Join Video Call
            </a>
          )}
          {!pool.videoCallUrl && pool.isCommissioner && (
            <span className="ml-auto text-[10px] text-white/40">Add a video call link in settings</span>
          )}
        </div>
      )}

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
            context={announcementContext}
            onDismiss={() => { setAnnouncement(null); setLatestMatchType(null); setAnimateScore(false); setAnnouncementContext([]); }}
          />
        </div>
      )}

      {!announcement && (
        <div className="mb-4">
          <OnTheClock
            draftOrder={draftOrder}
            results={results.map(r => ({
              pickNumber: r.pickNumber,
              playerName: r.playerName,
              playerPosition: r.playerPosition,
              teamAbbreviation: r.teamAbbreviation,
            }))}
            previousPickContext={previousPickContext}
          />
        </div>
      )}

      {/* Mobile tabs — MobileTabBar is lg:hidden internally */}
      <MobileTabBar key={`mobile-${poolId}`} tabs={mobileTabs} defaultTab="picks">
        {(activeTab) => (
          <>
            {activeTab === "picks" && picksColumn}
            {activeTab === "trivia" && triviaColumn}
            {activeTab === "leaderboard" && leaderboardColumn}
            {activeTab === "chat" && showChat && (
              <div className="h-[calc(100vh-200px)]">
                <PoolChat poolId={poolId!} currentUserId={userId!} isSpectator={isSpectator ?? false} commissionerId={pool?.commissionerId ?? ""} systemEvents={systemEvents} />
              </div>
            )}
          </>
        )}
      </MobileTabBar>

      {/* Desktop 3-column layout — hidden below lg */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_340px_320px] gap-6" key={`desktop-${poolId}`}>
        {picksColumn}
        {triviaColumn}
        {leaderboardColumn}
      </div>

      {/* Floating chat button + draggable panel (desktop only) */}
      {showChat && (
        <>
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="hidden lg:flex fixed bottom-6 right-6 z-40 h-12 w-12 items-center justify-center rounded-full bg-[var(--lions-blue)] text-white shadow-lg hover:bg-[var(--lions-blue)]/80 transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </button>
          )}

          {chatOpen && (
            <div
              className="hidden lg:flex fixed z-40 w-[340px] h-[480px] flex-col rounded-xl border border-white/[0.12] bg-[var(--gtown-navy)] shadow-2xl"
              style={{ bottom: 24 - chatPos.y, right: 24 - chatPos.x }}
            >
              {/* Draggable header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={(e) => {
                  dragRef.current = { startX: e.clientX, startY: e.clientY, origX: chatPos.x, origY: chatPos.y };
                  function onMove(ev: MouseEvent) {
                    if (!dragRef.current) return;
                    setChatPos({
                      x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
                      y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
                    });
                  }
                  function onUp() {
                    dragRef.current = null;
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  }
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
              >
                <span className="text-sm font-semibold text-white">Live Feed</span>
                <button onClick={() => setChatOpen(false)} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white transition">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l10 10M11 1L1 11" /></svg>
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <PoolChat poolId={poolId} currentUserId={userId} isSpectator={isSpectator ?? false} commissionerId={pool?.commissionerId ?? ""} systemEvents={systemEvents} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
