"use client";

import { useState } from "react";
import { updatePoolSettings, lockPool, deletePool } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { PoolSettings } from "@/lib/pool-settings";
import { DEFAULT_POOL_SETTINGS } from "@/lib/pool-settings";

export function PoolSettingsForm({
  poolId,
  poolName,
  poolDescription,
  settings,
  isCommissioner,
}: {
  poolId: string;
  poolName: string;
  poolDescription: string;
  settings: PoolSettings;
  isCommissioner: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(poolName);
  const [description, setDescription] = useState(poolDescription);
  const [mockDraftBonus, setMockDraftBonus] = useState(settings.mockDraftBonus);
  const [livePredictions, setLivePredictions] = useState(settings.livePredictions);
  const [watchParty, setWatchParty] = useState(settings.watchParty);
  const [rounds, setRounds] = useState<number[]>(settings.rounds);
  const [scoringMode, setScoringMode] = useState<"standard" | "custom">(settings.scoringMode || "standard");
  const [pointValues, setPointValues] = useState(settings.mockPointValues);
  const [livePointValues, setLivePointValues] = useState(settings.livePointValues);
  const [triviaPointValues, setTriviaPointValues] = useState(settings.triviaPointValues || { easy: 3, medium: 5, hard: 10 });
  const [saving, setSaving] = useState(false);
  const isCustom = scoringMode === "custom";

  async function handleSave() {
    setSaving(true);
    try {
      await updatePoolSettings(poolId, {
        name,
        description,
        settings: {
          ...settings,
          rounds,
          mockDraftBonus,
          livePredictions,
          watchParty,
          scoringMode,
          mockPointValues: pointValues,
          livePointValues,
          triviaPointValues,
        },
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    if (!confirm("Lock this pool? No new members can join and settings will be frozen.")) return;
    await lockPool(poolId);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this pool permanently? This cannot be undone.")) return;
    await deletePool(poolId);
    router.push("/pools");
  }

  function toggleRound(r: number) {
    setRounds((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r].sort()
    );
  }

  return (
    <div className="space-y-8">
      {/* Name & Description */}
      <div className="bg-white/8 border border-white/[0.12] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">General</h3>
        <div>
          <label className="block text-sm text-white/50 mb-1">Pool Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-white/8 border border-white/[0.12] px-4 py-2 text-white text-sm focus:outline-none focus:border-[var(--gtown-highlight)]"
          />
        </div>
        <div>
          <label className="block text-sm text-white/50 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-white/8 border border-white/[0.12] px-4 py-2 text-white text-sm focus:outline-none focus:border-[var(--gtown-highlight)] resize-none"
          />
        </div>
      </div>

      {/* Rounds */}
      <div className="bg-white/8 border border-white/[0.12] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Rounds</h3>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((r) => (
            <button
              key={r}
              onClick={() => toggleRound(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                rounds.includes(r)
                  ? "bg-[var(--gtown-highlight)] text-white"
                  : "bg-white/5 text-white/50 border border-white/10"
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white/8 border border-white/[0.12] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Features</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-white">Mock Draft Bonus</span>
          <input
            type="checkbox"
            checked={mockDraftBonus}
            onChange={(e) => setMockDraftBonus(e.target.checked)}
            className="w-5 h-5 accent-[var(--gtown-highlight)]"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-white">Live Predictions</span>
          <input
            type="checkbox"
            checked={livePredictions}
            onChange={(e) => setLivePredictions(e.target.checked)}
            className="w-5 h-5 accent-[var(--gtown-highlight)]"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm text-white">Watch Party (Video Chat)</span>
            <p className="text-xs text-white/40">Jitsi video chat appears on draft night</p>
          </div>
          <input
            type="checkbox"
            checked={watchParty}
            onChange={(e) => setWatchParty(e.target.checked)}
            className="w-5 h-5 accent-[var(--gtown-highlight)]"
          />
        </label>
      </div>

      {/* Scoring Mode */}
      <div className="bg-white/8 border border-white/[0.12] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Scoring Mode</h3>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => {
              if (scoringMode === "custom") {
                if (!confirm("Switch to Standard Scoring? All point values will reset to defaults.")) return;
                setScoringMode("standard");
                setPointValues({ ...DEFAULT_POOL_SETTINGS.mockPointValues });
                setLivePointValues({ ...DEFAULT_POOL_SETTINGS.livePointValues });
                setTriviaPointValues({ ...DEFAULT_POOL_SETTINGS.triviaPointValues });
              }
            }}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold transition ${
              scoringMode === "standard"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-white/5 text-white/50 hover:text-white/60"
            }`}
          >
            Standard Scoring
          </button>
          <button
            onClick={() => {
              if (scoringMode === "standard") {
                if (!confirm("Custom scoring lets you set your own point values. Your pool will be marked as Custom Rules and won't be included in cross-pool rankings. Switch to Custom?")) return;
                setScoringMode("custom");
              }
            }}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold transition ${
              scoringMode === "custom"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-white/5 text-white/50 hover:text-white/60"
            }`}
          >
            Custom Scoring
          </button>
        </div>
        <p className="text-xs text-white/40">
          {scoringMode === "standard"
            ? "Using official point values. Your pool is eligible for cross-pool comparison."
            : "Custom point values active. Your pool will show a Custom Rules badge."}
        </p>
      </div>

      {/* Point values */}
      <div className="bg-white/8 border border-white/[0.12] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Mock Draft Points</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(pointValues).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs text-white/50 mb-1 capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </label>
              <input
                type="number"
                min={0}
                value={val}
                disabled={!isCustom}
                onChange={(e) =>
                  setPointValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  isCustom
                    ? "bg-white/5 border-white/10 text-white focus:border-[var(--gtown-highlight)]"
                    : "bg-white/[0.02] border-white/8 text-white/40 cursor-not-allowed"
                }`}
              />
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider pt-4">Live Prediction Points</h3>
        <div>
          <label className="block text-xs text-white/50 mb-1">Correct Player</label>
          <input
            type="number"
            min={0}
            value={livePointValues.correctPlayer}
            disabled={!isCustom}
            onChange={(e) =>
              setLivePointValues({ correctPlayer: Number(e.target.value) })
            }
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              isCustom
                ? "bg-white/5 border-white/10 text-white focus:border-[var(--gtown-highlight)]"
                : "bg-white/[0.02] border-white/8 text-white/40 cursor-not-allowed"
            }`}
          />
        </div>

        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider pt-4">Trivia Points</h3>
        <div className="grid grid-cols-3 gap-4">
          {(["easy", "medium", "hard"] as const).map((diff) => (
            <div key={diff}>
              <label className="block text-xs text-white/50 mb-1 capitalize">{diff}</label>
              <input
                type="number"
                min={0}
                value={triviaPointValues[diff]}
                disabled={!isCustom}
                onChange={(e) =>
                  setTriviaPointValues((prev) => ({ ...prev, [diff]: Number(e.target.value) }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  isCustom
                    ? "bg-white/5 border-white/10 text-white focus:border-[var(--gtown-highlight)]"
                    : "bg-white/[0.02] border-white/8 text-white/40 cursor-not-allowed"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-[var(--gtown-highlight)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Danger Zone</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleLock}
            className="rounded-lg border border-yellow-500/30 px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition"
          >
            Lock Pool
          </button>
          {isCommissioner && (
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
            >
              Delete Pool
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
