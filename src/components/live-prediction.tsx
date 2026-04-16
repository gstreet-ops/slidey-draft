"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useLiveUpdates } from "@/hooks/use-live-updates";

type Player = {
  id: string;
  name: string;
  position: string;
  school: string;
  rank: number | null;
};

type ActualResult = {
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  teamName: string;
  teamAbbreviation: string;
};

type PredictionState =
  | { type: "waiting_for_draft" }
  | { type: "on_the_clock"; pickNumber: number; teamName: string; teamAbbreviation: string }
  | { type: "submitted"; pickNumber: number; playerName: string; playerPosition: string; playerSchool: string; isAutoFilled?: boolean }
  | { type: "result"; pickNumber: number; correct: boolean; actualPlayer: string; predictedPlayer: string; points: number; correctCount: number; totalPredictions: number; isAutoFilled?: boolean }
  | { type: "missed"; pickNumber: number; actualPlayer: string; teamName: string };

export function LivePredictionWidget({
  poolId,
  poolName,
  allPlayers,
  actualResults,
  draftOrder,
}: {
  poolId: string;
  poolName: string;
  allPlayers: Player[];
  actualResults: ActualResult[];
  draftOrder: { pickNumber: number; teamName: string; teamAbbreviation: string }[];
}) {
  const [state, setState] = useState<PredictionState>({ type: "waiting_for_draft" });
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const isEditing = useRef(false);
  const [showCancel, setShowCancel] = useState(false);

  // Determine draft state
  const nextPickNumber = actualResults.length + 1;

  // Drafted player IDs
  const draftedPlayerIds = useMemo(
    () => new Set(actualResults.map((r) => r.playerId)),
    [actualResults]
  );

  // Available players (undrafted)
  const availablePlayers = useMemo(
    () => allPlayers.filter((p) => !draftedPlayerIds.has(p.id)),
    [allPlayers, draftedPlayerIds]
  );

  // Position list
  const positions = useMemo(
    () => ["ALL", ...Array.from(new Set(availablePlayers.map((p) => p.position))).sort()],
    [availablePlayers]
  );

  // Filtered by search and position
  const filteredPlayers = useMemo(() => {
    let list = availablePlayers;
    if (posFilter !== "ALL") list = list.filter((p) => p.position === posFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q) ||
          p.school.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 20);
  }, [availablePlayers, search, posFilter]);

  // Current team on the clock
  const currentTeam = draftOrder.find((d) => d.pickNumber === nextPickNumber);

  // Poll for prediction state
  const { data: predictionData } = useLiveUpdates<{
    announced: boolean;
    myPrediction: { playerName: string; playerPosition: string; playerSchool: string; isAutoFilled?: boolean } | null;
    predictions: { correct: boolean; pointsAwarded: number; userName: string; playerName: string }[];
    correctCount?: number;
    totalPredictions?: number;
    actualPlayerId?: string;
  }>({
    endpoints: [`/api/pools/${poolId}/predictions/${nextPickNumber}`],
    interval: 5000,
  });

  // Auto-expand picker when pick window opens
  useEffect(() => {
    if (state.type === "on_the_clock") setExpanded(true);
  }, [state.type]);

  useEffect(() => {
    if (actualResults.length === 0) {
      setState({ type: "waiting_for_draft" });
      return;
    }

    if (predictionData?.announced) {
      const result = actualResults.find((r) => r.pickNumber === nextPickNumber - 1);
      if (result) {
        const myPrediction = predictionData.myPrediction;
        if (myPrediction) {
          const correct = predictionData.predictions.some((p) => p.correct);
          setState({
            type: "result",
            pickNumber: nextPickNumber - 1,
            correct,
            actualPlayer: result.playerName,
            predictedPlayer: myPrediction.playerName,
            points: correct ? (predictionData.predictions.find((p) => p.correct)?.pointsAwarded ?? 0) : 0,
            correctCount: predictionData.correctCount ?? 0,
            totalPredictions: predictionData.totalPredictions ?? 0,
            isAutoFilled: myPrediction.isAutoFilled,
          });
        } else {
          setState({
            type: "missed",
            pickNumber: nextPickNumber - 1,
            actualPlayer: result.playerName,
            teamName: result.teamName,
          });
        }
      }
      return;
    }

    if (predictionData?.myPrediction) {
      if (!isEditing.current) {
        setState({
          type: "submitted",
          pickNumber: nextPickNumber,
          playerName: predictionData.myPrediction.playerName,
          playerPosition: predictionData.myPrediction.playerPosition,
          playerSchool: predictionData.myPrediction.playerSchool,
          isAutoFilled: predictionData.myPrediction.isAutoFilled,
        });
      }
      return;
    }

    if (currentTeam) {
      setState({
        type: "on_the_clock",
        pickNumber: nextPickNumber,
        teamName: currentTeam.teamName,
        teamAbbreviation: currentTeam.teamAbbreviation,
      });
    }
  }, [actualResults, predictionData, nextPickNumber, currentTeam]);

  async function handleSubmit() {
    if (!selectedPlayerId || state.type !== "on_the_clock") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pools/${poolId}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickNumber: state.pickNumber, playerId: selectedPlayerId }),
      });
      if (res.ok) {
        isEditing.current = false;
        setShowCancel(false);
        const player = allPlayers.find((p) => p.id === selectedPlayerId);
        setState({
          type: "submitted",
          pickNumber: state.pickNumber,
          playerName: player?.name || "",
          playerPosition: player?.position || "",
          playerSchool: player?.school || "",
          isAutoFilled: false,
        });
        setSelectedPlayerId("");
        setSearch("");
        setExpanded(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Status line shown when collapsed
  function statusLine() {
    switch (state.type) {
      case "waiting_for_draft":
        return <span className="text-white/50">Draft not started</span>;
      case "on_the_clock":
        return (
          <span className="text-yellow-400 font-semibold">
            Pick #{state.pickNumber} — {state.teamName} on the clock
          </span>
        );
      case "submitted":
        return (
          <span className="text-green-400 font-semibold">
            {state.isAutoFilled ? "Auto-filled: " : "Locked in: "}
            {state.playerName}
          </span>
        );
      case "result":
        return (
          <span className={state.correct ? "text-green-400 font-semibold" : "text-white/50"}>
            Pick #{state.pickNumber}:{" "}
            {state.correct ? `+${state.points}pts — Correct!` : `+0pts — Missed (${state.actualPlayer})`}
          </span>
        );
      case "missed":
        return (
          <span className="text-white/50">
            Pick #{state.pickNumber}: Missed — {state.actualPlayer}
          </span>
        );
    }
  }

  const canCollapse = state.type !== "on_the_clock";

  return (
    <div className="bg-white/8 border border-white/[0.12] rounded-xl overflow-hidden">
      {/* Header bar — always visible */}
      <button
        onClick={() => canCollapse && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-3 ${canCollapse ? "cursor-pointer hover:bg-white/5" : "cursor-default"} transition`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider shrink-0">
            Prediction
          </span>
          <span className="text-sm truncate">{statusLine()}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs text-white/20">{poolName}</span>
          {canCollapse && (
            <svg
              className={`w-4 h-4 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
          {state.type === "waiting_for_draft" && (
            <p className="text-white/50 text-sm">
              The draft hasn&apos;t started yet. Predictions open when Pick #1 goes on the clock.
            </p>
          )}

          {state.type === "on_the_clock" && (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                <p className="text-yellow-400 font-bold">
                  Pick #{state.pickNumber} — {state.teamName} is on the clock
                </p>
                <p className="text-yellow-400/50 text-xs mt-0.5">
                  Submit before the pick is announced to earn points
                </p>
              </div>

              {/* Player search */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, position, or school..."
                  className="w-full rounded-lg bg-white/8 border border-white/[0.12] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--gtown-highlight)]"
                />

                <div className="flex gap-1 flex-wrap">
                  {positions.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosFilter(pos)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition ${
                        posFilter === pos
                          ? "bg-[var(--gtown-highlight)] text-white"
                          : "bg-white/5 text-white/50 hover:text-white/60"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1">
                  {filteredPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                        selectedPlayerId === p.id
                          ? "bg-[var(--gtown-highlight)] text-white"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {p.rank && (
                        <span className="text-xs font-bold opacity-60 w-5 text-right shrink-0">
                          #{p.rank}
                        </span>
                      )}
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-white/50">
                        {p.position} &middot; {p.school}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {showCancel && (
                  <button
                    onClick={() => {
                      isEditing.current = false;
                      setShowCancel(false);
                      setSelectedPlayerId("");
                      setSearch("");
                      setPosFilter("ALL");
                    }}
                    className="rounded-lg border border-white/[0.12] bg-white/8 px-4 py-3 text-sm text-white/50 hover:text-white/80 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!selectedPlayerId || submitting}
                  className="flex-1 rounded-lg bg-[var(--gtown-highlight)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--gtown-highlight)]/80 transition disabled:opacity-50"
                >
                  {submitting ? "Locking In..." : "Lock In Prediction"}
                </button>
              </div>
              <p className="text-xs text-white/40 text-center">
                10 pts for correct &middot; 0 pts for wrong &middot; auto-filled with BPA if no pick
              </p>
            </div>
          )}

          {state.type === "submitted" && (
            <div className="space-y-3">
              {state.isAutoFilled ? (
                <div className="bg-white/8 border border-white/[0.12] rounded-lg p-3 text-center">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">
                    Auto-filled (BPA)
                  </p>
                  <p className="text-white/70 font-semibold">{state.playerName}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {state.playerPosition} &middot; {state.playerSchool}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-green-400 text-lg">&#10003;</span>
                    <span className="text-white font-semibold">Locked in:</span>
                  </div>
                  <p className="text-white text-lg font-bold">{state.playerName}</p>
                  <p className="text-white/50 text-sm">
                    {state.playerPosition} &middot; {state.playerSchool}
                  </p>
                </div>
              )}
              <p className="text-white/40 text-sm text-center animate-pulse">
                Waiting for pick to be announced...
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isEditing.current = true;
                  setShowCancel(true);
                  setSelectedPlayerId("");
                  setSearch("");
                  setPosFilter("ALL");
                  setExpanded(true);
                  const team = draftOrder.find(d => d.pickNumber === state.pickNumber);
                  setState({
                    type: "on_the_clock",
                    pickNumber: state.pickNumber,
                    teamName: team?.teamName || "",
                    teamAbbreviation: team?.teamAbbreviation || "",
                  });
                }}
                className="w-full rounded-lg border border-white/[0.12] bg-white/8 px-4 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/10 transition"
              >
                Change Pick
              </button>
            </div>
          )}

          {state.type === "result" && (
            <div className="space-y-3">
              {state.correct ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                  <p className="text-green-400 font-bold text-lg">
                    Correct! +{state.points} pts
                  </p>
                  <p className="text-green-400/70 text-sm mt-1">{state.actualPlayer}</p>
                </div>
              ) : (
                <div className="bg-white/8 border border-white/[0.12] rounded-lg p-4 text-center space-y-1">
                  <p className="text-white/50 text-sm">
                    Actual pick:{" "}
                    <span className="text-white font-semibold">{state.actualPlayer}</span>
                  </p>
                  <p className="text-white/40 text-xs">
                    {state.isAutoFilled ? "Auto-filled: " : "You predicted: "}
                    {state.predictedPlayer}
                  </p>
                  <p className="text-white/20 text-xs">+0 pts</p>
                </div>
              )}
              <p className="text-white/40 text-xs text-center">
                {state.correctCount} of {state.totalPredictions} members correct
              </p>
            </div>
          )}

          {state.type === "missed" && (
            <div className="text-center space-y-2">
              <p className="text-white/60 text-sm">
                Pick #{state.pickNumber}:{" "}
                <span className="text-white">{state.actualPlayer}</span> to {state.teamName}
              </p>
              <p className="text-white/40 text-xs">Window closed — no prediction submitted.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
