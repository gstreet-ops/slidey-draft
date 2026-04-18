import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSimulationState, getTriviaStatus } from "./actions";
import { SimulationControls } from "./simulation-controls";

export const dynamic = "force-dynamic";

export default async function SimulatePage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");

  const [state, triviaStatus] = await Promise.all([
    getSimulationState(),
    getTriviaStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          DRAFT SIMULATION
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Run a live draft simulation. Open{" "}
          <a href="/live" target="_blank" className="text-[var(--steelers-gold)] underline">
            Live
          </a>{" "}
          in another tab to watch.
        </p>
      </div>

      {/* Simulation Guide */}
      <details className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <summary className="px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition">
          How to Run a Simulation
        </summary>
        <div className="px-5 pb-4 pt-1 space-y-2 text-sm text-[var(--text-muted)]">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)] text-xs font-bold">1</span>
            <p>Go to <a href="/admin/trivia" className="text-[var(--steelers-gold)] underline">Admin &rarr; Trivia</a> and build your question queue for the pool</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)] text-xs font-bold">2</span>
            <p>Open <a href="/live" target="_blank" className="text-[var(--steelers-gold)] underline">Live</a> in a second tab to watch as a player would</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)] text-xs font-bold">3</span>
            <p>Come back here and click <strong className="text-[var(--text-secondary)]">Announce Next Pick</strong> or <strong className="text-[var(--text-secondary)]">Auto-Run All</strong></p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)] text-xs font-bold">4</span>
            <p>Each pick triggers the next trivia question automatically</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)] text-xs font-bold">5</span>
            <p>Watch the leaderboard update in real-time</p>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3 pl-9">
            Commissioners can also manually control trivia (fire, skip, pause) from the Live trivia controls panel.
          </p>
        </div>
      </details>

      {/* Trivia Status */}
      {triviaStatus.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Trivia Status</h2>
          {triviaStatus.map((ts) => (
            <div key={ts.poolId} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[var(--text-secondary)] font-semibold">{ts.poolName}</span>
              {ts.activeQuestion ? (
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs text-orange-700">
                  Active: Q{ts.activeSortOrder} &mdash; {ts.activeQuestion.length > 50 ? ts.activeQuestion.slice(0, 50) + "..." : ts.activeQuestion}
                </span>
              ) : (
                <span className="rounded-full bg-[var(--bg-card)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">No active question</span>
              )}
              <span className="text-xs text-[var(--text-muted)]">
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
