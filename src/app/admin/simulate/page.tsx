import { getSimulationState, getTriviaStatus } from "./actions";
import { SimulationControls } from "./simulation-controls";

export const dynamic = "force-dynamic";

export default async function SimulatePage() {
  const [state, triviaStatus] = await Promise.all([
    getSimulationState(),
    getTriviaStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          DRAFT SIMULATION
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Run a live draft simulation. Open{" "}
          <a href="/live" target="_blank" className="text-[var(--lions-blue)] underline">
            Live
          </a>{" "}
          or{" "}
          <a href="/leaderboard" target="_blank" className="text-[var(--lions-blue)] underline">
            Leaderboard
          </a>{" "}
          in another tab to watch.
        </p>
      </div>

      {/* Simulation Guide */}
      <details className="rounded-xl border border-white/[0.12] bg-white/8">
        <summary className="px-5 py-3 text-sm font-semibold text-white/60 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition">
          How to Run a Simulation
        </summary>
        <div className="px-5 pb-4 pt-1 space-y-2 text-sm text-white/50">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-xs font-bold">1</span>
            <p>Go to <a href="/admin/trivia" className="text-[var(--lions-blue)] underline">Admin &rarr; Trivia</a> and build your question queue for the pool</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-xs font-bold">2</span>
            <p>Open <a href="/live" target="_blank" className="text-[var(--lions-blue)] underline">Live</a> in a second tab to watch as a player would</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-xs font-bold">3</span>
            <p>Come back here and click <strong className="text-white/70">Announce Next Pick</strong> or <strong className="text-white/70">Auto-Run All</strong></p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-xs font-bold">4</span>
            <p>Each pick triggers the next trivia question automatically</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-[var(--lions-blue)] text-xs font-bold">5</span>
            <p>Watch the leaderboard update in real-time</p>
          </div>
          <p className="text-xs text-white/40 mt-3 pl-9">
            Commissioners can also manually control trivia (fire, skip, pause) from the Live trivia controls panel.
          </p>
        </div>
      </details>

      {/* Trivia Status */}
      {triviaStatus.length > 0 && (
        <div className="rounded-xl border border-white/[0.12] bg-white/8 p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">Trivia Status</h2>
          {triviaStatus.map((ts) => (
            <div key={ts.poolId} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-white/60 font-semibold">{ts.poolName}</span>
              {ts.activeQuestion ? (
                <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs text-orange-400">
                  Active: Q{ts.activeSortOrder} &mdash; {ts.activeQuestion.length > 50 ? ts.activeQuestion.slice(0, 50) + "..." : ts.activeQuestion}
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50">No active question</span>
              )}
              <span className="text-xs text-white/40">
                {ts.pending} pending &middot; {ts.completed} completed &middot; {ts.total} total
              </span>
            </div>
          ))}
        </div>
      )}

      <SimulationControls initialState={state} />
    </div>
  );
}
