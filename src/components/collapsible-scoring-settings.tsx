"use client";

import { useState } from "react";
import { updatePoolSettings } from "@/lib/actions";

type ScoringConfig = {
  scoringMode: "standard" | "custom";
  mockPointValues: { playerCalled: number; rangeClose: number; rangeFar: number; exactSlot: number; positionMatch: number };
  livePointValues: { correctPlayer: number };
  triviaPointValues: { easy: number; medium: number; hard: number };
};

const STANDARD: ScoringConfig = {
  scoringMode: "standard",
  mockPointValues: { playerCalled: 3, rangeClose: 2, rangeFar: 1, exactSlot: 5, positionMatch: 1 },
  livePointValues: { correctPlayer: 10 },
  triviaPointValues: { easy: 3, medium: 5, hard: 10 },
};

export function CollapsibleScoringSettings({
  poolId,
  initialConfig,
}: {
  poolId: string;
  initialConfig: ScoringConfig;
}) {
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<ScoringConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updatePoolSettings(poolId, { settings: config as unknown as Record<string, unknown> });
      showToast("Scoring settings saved");
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function setMode(mode: "standard" | "custom") {
    if (mode === "standard") {
      setConfig(STANDARD);
    } else {
      setConfig({ ...config, scoringMode: "custom" });
    }
  }

  function setMock(key: keyof ScoringConfig["mockPointValues"], val: number) {
    setConfig((c) => ({ ...c, mockPointValues: { ...c.mockPointValues, [key]: val } }));
  }

  function setLive(val: number) {
    setConfig((c) => ({ ...c, livePointValues: { correctPlayer: val } }));
  }

  function setTrivia(key: keyof ScoringConfig["triviaPointValues"], val: number) {
    setConfig((c) => ({ ...c, triviaPointValues: { ...c.triviaPointValues, [key]: val } }));
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#FFB612] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-lg">
          {toast}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[var(--bg-card)] transition rounded-xl"
      >
        <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
          {"\uD83C\uDFC6"} Scoring Settings
        </span>
        <span className="text-xs text-[var(--text-muted)]">{expanded ? "\u25BE" : "\u25B8"}</span>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">Mode:</span>
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setMode("standard")}
                className={`px-3 py-1.5 text-xs font-semibold transition ${config.scoringMode === "standard" ? "bg-[#FFB612] text-[var(--text-primary)]" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                Standard
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`px-3 py-1.5 text-xs font-semibold transition ${config.scoringMode === "custom" ? "bg-[#FFB612] text-[var(--text-primary)]" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                Custom
              </button>
            </div>
          </div>

          {config.scoringMode === "custom" && (
            <div className="space-y-4">
              {/* Mock Pick Points */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Mock Draft Points</h4>
                <div className="grid grid-cols-2 gap-3">
                  <PointInput label="Exact slot match" value={config.mockPointValues.exactSlot} onChange={(v) => setMock("exactSlot", v)} />
                  <PointInput label="Player called (any slot)" value={config.mockPointValues.playerCalled} onChange={(v) => setMock("playerCalled", v)} />
                  <PointInput label="Within 5 picks" value={config.mockPointValues.rangeClose} onChange={(v) => setMock("rangeClose", v)} />
                  <PointInput label="6+ picks off" value={config.mockPointValues.rangeFar} onChange={(v) => setMock("rangeFar", v)} />
                  <PointInput label="Position match bonus" value={config.mockPointValues.positionMatch} onChange={(v) => setMock("positionMatch", v)} />
                </div>
              </div>

              {/* Live Prediction Points */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Live Prediction Points</h4>
                <PointInput label="Correct prediction" value={config.livePointValues.correctPlayer} onChange={setLive} />
              </div>

              {/* Trivia Points */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Trivia Points</h4>
                <div className="grid grid-cols-3 gap-3">
                  <PointInput label="Easy" value={config.triviaPointValues.easy} onChange={(v) => setTrivia("easy", v)} />
                  <PointInput label="Medium" value={config.triviaPointValues.medium} onChange={(v) => setTrivia("medium", v)} />
                  <PointInput label="Hard" value={config.triviaPointValues.hard} onChange={(v) => setTrivia("hard", v)} />
                </div>
              </div>
            </div>
          )}

          {config.scoringMode === "standard" && (
            <p className="text-xs text-[var(--text-muted)]">Standard scoring: Exact slot +5, Player called +3, Within 5 +2, 6+ off +1, Position match +1. Live predictions +10. Trivia: Easy 3, Medium 5, Hard 10.</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-green-500 transition disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Scoring Settings"}
          </button>
        </div>
      )}
    </div>
  );
}

function PointInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-[var(--text-muted)] mb-1">{label}</label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
      />
    </div>
  );
}
