"use client";

import { useState } from "react";
import { updatePoolSettings, lockPool, deletePool } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { PoolSettings } from "@/lib/pool-settings";
import { DEFAULT_POOL_SETTINGS } from "@/lib/pool-settings";
import { FEATURES } from "@/lib/feature-flags";

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
  const [trivia, setTrivia] = useState(settings.trivia);
  const [propBets, setPropBets] = useState(settings.propBets);
  const [watchParty, setWatchParty] = useState(settings.watchParty);
  const [teams, setTeams] = useState(settings.teams ?? false);
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
          trivia,
          propBets,
          watchParty,
          teams,
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
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">General</h3>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">Pool Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--steelers-gold)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--steelers-gold)] resize-none"
          />
        </div>
      </div>

      {/* Rounds */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Rounds</h3>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((r) => (
            <button
              key={r}
              onClick={() => toggleRound(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                rounds.includes(r)
                  ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]"
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Active Features</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Choose which features are available to your pool members. Disabled features are hidden from all members.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const value = f.key === "mockDraft" ? mockDraftBonus
              : f.key === "livePredictions" ? livePredictions
              : f.key === "trivia" ? trivia
              : f.key === "propBets" ? propBets
              : f.key === "watchParty" ? watchParty
              : teams;
            const setValue = f.key === "mockDraft" ? setMockDraftBonus
              : f.key === "livePredictions" ? setLivePredictions
              : f.key === "trivia" ? setTrivia
              : f.key === "propBets" ? setPropBets
              : f.key === "watchParty" ? setWatchParty
              : setTeams;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setValue(!value)}
                className={`rounded-xl border p-4 cursor-pointer transition text-left ${
                  value
                    ? "border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10"
                    : "border-[var(--border)] bg-[var(--bg-card)] opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{f.label}</p>
                      <span
                        className={`shrink-0 mt-0.5 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          value ? "bg-[var(--steelers-gold)]" : "bg-[var(--bg-card)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? "translate-x-[18px]" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)] leading-snug">{f.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scoring Mode */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Scoring Mode</h3>
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
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
                ? "bg-blue-100 text-blue-700"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
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
                ? "bg-amber-100 text-amber-700"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Custom Scoring
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {scoringMode === "standard"
            ? "Using official point values. Your pool is eligible for cross-pool comparison."
            : "Custom point values active. Your pool will show a Custom Rules badge."}
        </p>
      </div>

      {/* Point values */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Mock Draft Points</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(pointValues).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs text-[var(--text-muted)] mb-1 capitalize">
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
                    ? "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--steelers-gold)]"
                    : "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-muted)] cursor-not-allowed"
                }`}
              />
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider pt-4">Live Prediction Points</h3>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Correct Player</label>
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
                ? "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--steelers-gold)]"
                : "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-muted)] cursor-not-allowed"
            }`}
          />
        </div>

        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider pt-4">Trivia Points</h3>
        <div className="grid grid-cols-3 gap-4">
          {(["easy", "medium", "hard"] as const).map((diff) => (
            <div key={diff}>
              <label className="block text-xs text-[var(--text-muted)] mb-1 capitalize">{diff}</label>
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
                    ? "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--steelers-gold)]"
                    : "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-muted)] cursor-not-allowed"
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
        className="w-full rounded-lg bg-[var(--steelers-gold)] px-6 py-3 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider">Danger Zone</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleLock}
            className="rounded-lg border border-yellow-200 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition"
          >
            Lock Pool
          </button>
          {isCommissioner && (
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition"
            >
              Delete Pool
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
