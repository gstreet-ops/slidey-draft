"use client";

import { useState, useRef } from "react";
import { simulateNextPick, resetSimulation, getSimulationState } from "./actions";

type SimState = Awaited<ReturnType<typeof getSimulationState>>;

export function SimulationControls({ initialState }: { initialState: SimState }) {
  const [state, setState] = useState(initialState);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(3); // seconds between picks
  const [lastPick, setLastPick] = useState<string | null>(null);
  const stopRef = useRef(false);

  async function refresh() {
    const s = await getSimulationState();
    setState(s);
  }

  const [error, setError] = useState<string | null>(null);

  async function handleNextPick() {
    setRunning(true);
    setError(null);
    try {
      const result = await simulateNextPick();
      if (result.error) {
        setError(result.error);
      } else if (!result.done) {
        setLastPick(`#${result.pickNumber}: ${result.playerName}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    await refresh();
    setRunning(false);
  }

  async function handleAutoRun() {
    setRunning(true);
    stopRef.current = false;
    setError(null);

    let current = state.picksAnnounced;
    while (current < state.totalPicks && !stopRef.current) {
      try {
        const result = await simulateNextPick();
        if (result.error) {
          setError(result.error);
          break;
        }
        if (result.done) break;
        setLastPick(`#${result.pickNumber}: ${result.playerName}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        break;
      }
      await refresh();
      current++;
      if (current < state.totalPicks && !stopRef.current) {
        await new Promise((r) => setTimeout(r, speed * 1000));
      }
    }
    setRunning(false);
  }

  function handleStop() {
    stopRef.current = true;
  }

  async function handleReset() {
    if (!confirm("Reset simulation? This clears all actual results and scores.")) return;
    setRunning(true);
    await resetSimulation();
    setLastPick(null);
    await refresh();
    setRunning(false);
  }

  const progress = state.totalPicks > 0
    ? Math.round((state.picksAnnounced / state.totalPicks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">
            {state.picksAnnounced} / {state.totalPicks} picks announced
          </span>
          <span className="text-sm text-white/50">{progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--lions-blue)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {error && (
          <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            Error: {error}
          </div>
        )}
        {lastPick && (
          <p className="mt-2 text-sm text-green-400">
            Last announced: {lastPick}
          </p>
        )}
        {state.nextProspect && (
          <p className="mt-1 text-xs text-white/40">
            Next up: Pick #{state.nextPickNumber} &mdash; {state.nextProspect.name} ({state.nextProspect.position})
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleNextPick}
          disabled={running || state.picksAnnounced >= state.totalPicks}
          className="rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-500 transition disabled:opacity-40"
        >
          Announce Next Pick
        </button>

        {!running ? (
          <button
            onClick={handleAutoRun}
            disabled={state.picksAnnounced >= state.totalPicks}
            className="rounded-lg bg-[var(--lions-blue)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--lions-blue)]/80 transition disabled:opacity-40"
          >
            Auto-Run All
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 transition"
          >
            Stop
          </button>
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs text-white/50">Speed:</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
          >
            <option value={1}>1s (fast)</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s (slow)</option>
          </select>
        </div>

        <button
          onClick={handleReset}
          disabled={running}
          className="rounded-lg border border-red-500/30 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">Leaderboard</h2>
          {state.leaderboard.length === 0 ? (
            <p className="text-sm text-white/30">No scores yet — announce a pick to start.</p>
          ) : (
            <div className="space-y-2">
              {state.leaderboard.map((entry, i) => (
                <div key={entry.title} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                    i === 1 ? "bg-gray-400/20 text-gray-300" :
                    i === 2 ? "bg-orange-500/20 text-orange-400" :
                    "bg-white/5 text-white/40"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{entry.title}</p>
                    <p className="text-xs text-white/40">{entry.correctExact} exact &middot; {entry.correctPlayer} correct</p>
                  </div>
                  <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announce log */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">Draft Feed</h2>
          {state.announceLog.length === 0 ? (
            <p className="text-sm text-white/30">No picks announced yet.</p>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {[...state.announceLog].reverse().map((pick) => (
                <div key={pick.pickNumber} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/10 text-xs font-bold text-white">
                    {pick.pickNumber}
                  </span>
                  <span className="font-semibold text-white">{pick.playerName}</span>
                  <span className="text-xs text-[var(--lions-blue)]">{pick.playerPosition}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
