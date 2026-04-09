import { getSimulationState } from "./actions";
import { SimulationControls } from "./simulation-controls";

export const dynamic = "force-dynamic";

export default async function SimulatePage() {
  const state = await getSimulationState();

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
            /live
          </a>{" "}
          or{" "}
          <a href="/leaderboard" target="_blank" className="text-[var(--lions-blue)] underline">
            /leaderboard
          </a>{" "}
          in another tab to watch.
        </p>
      </div>

      <SimulationControls initialState={state} />
    </div>
  );
}
