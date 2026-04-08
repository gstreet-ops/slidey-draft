"use client";

import { useState } from "react";
import { updatePoolSettings, lockPool, deletePool } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { PoolSettings } from "@/lib/pool-helpers";

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
  const [rounds, setRounds] = useState<number[]>(settings.rounds);
  const [pointValues, setPointValues] = useState(settings.mockPointValues);
  const [livePointValues, setLivePointValues] = useState(settings.livePointValues);
  const [saving, setSaving] = useState(false);

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
          mockPointValues: pointValues,
          livePointValues,
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
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">General</h3>
        <div>
          <label className="block text-sm text-white/50 mb-1">Pool Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white text-sm focus:outline-none focus:border-[var(--gtown-highlight)]"
          />
        </div>
        <div>
          <label className="block text-sm text-white/50 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white text-sm focus:outline-none focus:border-[var(--gtown-highlight)] resize-none"
          />
        </div>
      </div>

      {/* Rounds */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Rounds</h3>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((r) => (
            <button
              key={r}
              onClick={() => toggleRound(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                rounds.includes(r)
                  ? "bg-[var(--gtown-highlight)] text-white"
                  : "bg-white/5 text-white/40 border border-white/10"
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
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
      </div>

      {/* Point values */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Mock Point Values</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(pointValues).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1 capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </label>
              <input
                type="number"
                min={0}
                value={val}
                onChange={(e) =>
                  setPointValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--gtown-highlight)]"
              />
            </div>
          ))}
        </div>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider pt-4">Live Point Values</h3>
        <div>
          <label className="block text-xs text-white/40 mb-1">Correct Player</label>
          <input
            type="number"
            min={0}
            value={livePointValues.correctPlayer}
            onChange={(e) =>
              setLivePointValues({ correctPlayer: Number(e.target.value) })
            }
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--gtown-highlight)]"
          />
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
