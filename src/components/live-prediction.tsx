"use client";

import { useState, useEffect, useMemo } from "react";
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
  | { type: "submitted"; pickNumber: number; playerName: string; playerPosition: string; playerSchool: string }
  | { type: "result"; pickNumber: number; correct: boolean; actualPlayer: string; predictedPlayer: string; points: number; correctCount: number; totalPredictions: number }
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
    myPrediction: { playerName: string; playerPosition: string; playerSchool: string } | null;
    predictions: { correct: boolean; pointsAwarded: number; userName: string; playerName: string }[];
    correctCount?: number;
    totalPredictions?: number;
    actualPlayerId?: string;
  }>({
    endpoints: [`/api/pools/${poolId}/predictions/${nextPickNumber}`],
    interval: 5000,
  });

  useEffect(() => {
    if (actualResults.length === 0) {
      setState({ type: "waiting_for_draft" });
      return;
    }

    if (predictionData?.announced) {
      // Find the actual player
      const result = actualResults.find((r) => r.pickNumber === nextPickNumber - 1);
      if (result) {
        const myPred = predictionData.predictions.find(() => true); // Already filtered by API
        if (predictionData.myPrediction || myPred) {
          const correct = predictionData.predictions.some((p) => p.correct);
          setState({
            type: "result",
            pickNumber: nextPickNumber - 1,
            correct,
            actualPlayer: result.playerName,
            predictedPlayer: predictionData.myPrediction?.playerName || "",
            points: correct ? (predictionData.predictions.find((p) => p.correct)?.pointsAwarded ?? 0) : 0,
            correctCount: predictionData.correctCount ?? 0,
            totalPredictions: predictionData.totalPredictions ?? 0,
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
      setState({
        type: "submitted",
        pickNumber: nextPickNumber,
        playerName: predictionData.myPrediction.playerName,
        playerPosition: predictionData.myPrediction.playerPosition,
        playerSchool: predictionData.myPrediction.playerSchool,
      });
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
        const player = allPlayers.find((p) => p.id === selectedPlayerId);
        setState({
          type: "submitted",
          pickNumber: state.pickNumber,
          playerName: player?.name || "",
          playerPosition: player?.position || "",
          playerSchool: player?.school || "",
        });
        setSelectedPlayerId("");
        setSearch("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          Live Prediction
        </h3>
        <span className="text-xs text-white/30">{poolName}</span>
      </div>

      {state.type === "waiting_for_draft" && (
        <p className="text-white/40 text-sm">
          The draft hasn&apos;t started yet. Predictions will open when Pick #1 goes on the clock.
        </p>
      )}

      {state.type === "on_the_clock" && (
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
            <p className="text-yellow-400 font-bold text-lg">
              {state.teamName} is on the clock — Pick #{state.pickNumber}
            </p>
          </div>

          {/* Player search */}
          <div className="space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, position, or school..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--gtown-highlight)]"
            />

            <div className="flex gap-1 flex-wrap">
              {positions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    posFilter === pos
                      ? "bg-[var(--gtown-highlight)] text-white"
                      : "bg-white/5 text-white/40 hover:text-white/60"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
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
                    <span className="text-xs font-bold opacity-60 w-5 text-right shrink-0">#{p.rank}</span>
                  )}
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-white/40">{p.position} &middot; {p.school}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedPlayerId || submitting}
            className="w-full rounded-lg bg-[var(--gtown-highlight)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--gtown-highlight)]/80 transition disabled:opacity-50"
          >
            {submitting ? "Locking In..." : "Lock In Prediction"}
          </button>
          <p className="text-xs text-white/30 text-center">
            Your prediction locks when the pick is announced
          </p>
        </div>
      )}

      {state.type === "submitted" && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400 text-lg">&#10003;</span>
            <span className="text-white font-semibold">You predicted:</span>
          </div>
          <p className="text-white text-lg font-bold">{state.playerName}</p>
          <p className="text-white/40 text-sm">
            {state.playerPosition} &middot; {state.playerSchool}
          </p>
          <p className="text-white/30 text-sm animate-pulse">
            Waiting for pick to be announced...
          </p>
        </div>
      )}

      {state.type === "result" && (
        <div className="text-center space-y-3">
          {state.correct ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-400 font-bold text-lg">
                You nailed it! {state.actualPlayer} +{state.points} points
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-white/60">
                Actual pick: <span className="text-white font-semibold">{state.actualPlayer}</span>
              </p>
              <p className="text-white/40 text-sm">
                You predicted: {state.predictedPlayer}
              </p>
            </div>
          )}
          <p className="text-white/30 text-xs">
            {state.correctCount} of {state.totalPredictions} members predicted correctly
          </p>
        </div>
      )}

      {state.type === "missed" && (
        <div className="text-center space-y-2">
          <p className="text-white/60 text-sm">
            Pick #{state.pickNumber}: <span className="text-white">{state.actualPlayer}</span> to {state.teamName}.
          </p>
          <p className="text-white/30 text-xs">You didn&apos;t submit a prediction.</p>
        </div>
      )}
    </div>
  );
}
