"use client";

import { useState, useRef } from "react";
import { simulateNextPick, resetSimulation, getSimulationState } from "@/app/admin/simulate/actions";

type SimState = Awaited<ReturnType<typeof getSimulationState>>;

export function CollapsibleSimControls() {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<SimState | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [lastPick, setLastPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  async function refresh() {
    const s = await getSimulationState();
    setState(s);
  }

  async function handleExpand() {
    setExpanded(!expanded);
    if (!state) await refresh();
  }

  async function handleNextPick() {
    setRunning(true);
    setError(null);
    try {
      const result = await simulateNextPick();
      if (result.error) setError(result.error);
      else if (!result.done) setLastPick(`#${result.pickNumber}: ${result.playerName}`);
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
    if (!state) await refresh();

    let current = state?.picksAnnounced ?? 0;
    const total = state?.totalPicks ?? 32;
    while (current < total && !stopRef.current) {
      try {
        const result = await simulateNextPick();
        if (result.error) { setError(result.error); break; }
        if (result.done) break;
        setLastPick(`#${result.pickNumber}: ${result.playerName}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        break;
      }
      await refresh();
      current++;
      if (current < total && !stopRef.current) {
        await new Promise((r) => setTimeout(r, speed * 1000));
      }
    }
    setRunning(false);
  }

  async function handleReset() {
    if (!confirm("Reset simulation? This clears all results, scores, and trivia progress.")) return;
    setRunning(true);
    await resetSimulation();
    setLastPick(null);
    setError(null);
    await refresh();
    setRunning(false);
  }

  const progress = state && state.totalPicks > 0
    ? Math.round((state.picksAnnounced / state.totalPicks) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button
        onClick={handleExpand}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition rounded-xl"
      >
        <span className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <span>{"\u{1F3AE}"}</span> Simulation Controls
        </span>
        <span className="text-xs text-white/30">{expanded ? "\u25BE" : "\u25B8"}</span>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Progress */}
          {state && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50">{state.picksAnnounced} / {state.totalPicks} picks</span>
                <span className="text-xs text-white/30">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--lions-blue)] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          {lastPick && <p className="text-xs text-green-400">Last: {lastPick}</p>}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleNextPick}
              disabled={running || (state?.picksAnnounced ?? 0) >= (state?.totalPicks ?? 32)}
              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500 transition disabled:opacity-40"
            >
              Next Pick
            </button>
            {!running ? (
              <button
                onClick={handleAutoRun}
                disabled={(state?.picksAnnounced ?? 0) >= (state?.totalPicks ?? 32)}
                className="rounded-lg bg-[var(--lions-blue)] px-4 py-2 text-xs font-bold text-white hover:opacity-80 transition disabled:opacity-40"
              >
                Auto-Run
              </button>
            ) : (
              <button
                onClick={() => { stopRef.current = true; }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                Stop
              </button>
            )}
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded bg-white/10 border border-white/20 px-2 py-1.5 text-xs text-white"
            >
              <option value={1}>1s</option>
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </select>
            <button
              onClick={handleReset}
              disabled={running}
              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
