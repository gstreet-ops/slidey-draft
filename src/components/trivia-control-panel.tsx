"use client";

import { useState, useEffect, useCallback } from "react";

type BankQuestion = {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  sortOrder: number | null;
  firedAt: string | null;
  pickNumber: number | null;
  responseCount: number;
  correctCount: number;
  accuracyPct: number | null;
  used: boolean;
};

type TriviaSettings = {
  triviaTimerSeconds: number;
  triviaMode: "auto" | "manual";
};

export function TriviaControlPanel({
  poolId,
  initialSettings,
}: {
  poolId: string;
  initialSettings: TriviaSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [unused, setUnused] = useState<BankQuestion[]>([]);
  const [used, setUsed] = useState<BankQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [showUsed, setShowUsed] = useState(false);

  const fetchBank = useCallback(async () => {
    const res = await fetch(`/api/pools/${poolId}/trivia/bank`);
    const data = await res.json();
    setUnused(data.unused);
    setUsed(data.used);
    setTotal(data.total);
    setLoading(false);
  }, [poolId]);

  useEffect(() => {
    fetchBank();
  }, [fetchBank]);

  async function updateSettings(updates: Partial<TriviaSettings>) {
    const res = await fetch(`/api/pools/${poolId}/trivia/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) {
      setSettings((prev) => ({ ...prev, ...data.settings }));
      setToast("Settings updated");
      setTimeout(() => setToast(""), 2000);
    }
  }

  async function fireQuestion(questionId: string) {
    if (!confirm("Fire this question to all players?")) return;
    setFiring(questionId);
    const res = await fetch(`/api/pools/${poolId}/trivia/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, timerSeconds: settings.triviaTimerSeconds }),
    });
    const data = await res.json();
    if (data.success) {
      setToast(`Question fired! (Pick #${data.question?.pickNumber ?? "?"})`);
      setTimeout(() => setToast(""), 3000);
      fetchBank();
    }
    setFiring(null);
  }

  async function skipPick() {
    const res = await fetch(`/api/pools/${poolId}/trivia/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.success) {
      setToast(`Skipped trivia for pick #${data.skippedPick}`);
      setTimeout(() => setToast(""), 3000);
    }
  }

  const diffColor: Record<string, string> = {
    easy: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    hard: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#0076B6] px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
          <button onClick={() => setToast("")} className="ml-3 text-white/70 hover:text-white">&times;</button>
        </div>
      )}

      {/* Settings Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Mode</span>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(["auto", "manual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => updateSettings({ triviaMode: m })}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  settings.triviaMode === m
                    ? "bg-[#0076B6] text-white"
                    : "bg-white/5 text-white/40 hover:text-white"
                }`}
              >
                {m === "auto" ? "Auto" : "Manual"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Timer</span>
          <select
            value={settings.triviaTimerSeconds}
            onChange={(e) => updateSettings({ triviaTimerSeconds: Number(e.target.value) })}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-[#0076B6] focus:outline-none"
          >
            {[15, 30, 45, 60].map((s) => (
              <option key={s} value={s} className="bg-gray-900">{s}s</option>
            ))}
          </select>
        </div>

        <button
          onClick={skipPick}
          className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white transition"
        >
          Skip This Pick
        </button>

        <div className="text-xs text-white/30">
          {unused.length} unused / {total} total
        </div>
      </div>

      {/* Question Bank */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Question Bank</h3>
        {loading ? (
          <div className="text-center py-8 text-white/30 text-sm">Loading questions...</div>
        ) : unused.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No unused questions. Generate more in the admin panel.</div>
        ) : (
          <div className="space-y-1.5">
            {unused.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{q.question}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffColor[q.difficulty] || "bg-white/10 text-white/40"}`}>
                  {q.difficulty}
                </span>
                <span className="shrink-0 rounded-full bg-[#0076B6]/20 px-2 py-0.5 text-[10px] text-[#0076B6]">
                  {q.category.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => fireQuestion(q.id)}
                  disabled={firing === q.id}
                  className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {firing === q.id ? "..." : "Fire"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Used Questions (collapsed) */}
      {used.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowUsed(!showUsed)}
            className="flex items-center gap-2 text-sm font-bold text-white/40 uppercase tracking-wider hover:text-white/60 transition"
          >
            <span>{showUsed ? "▾" : "▸"}</span>
            Used Questions ({used.length})
          </button>
          {showUsed && (
            <div className="space-y-1.5">
              {used.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/40 truncate">{q.question}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-white/20">
                    Pick #{q.pickNumber ?? "—"}
                  </span>
                  <span className="shrink-0 text-[10px] text-white/30">
                    {q.responseCount} answers
                  </span>
                  {q.accuracyPct !== null && (
                    <span className={`shrink-0 text-[10px] font-semibold ${q.accuracyPct >= 60 ? "text-green-400" : q.accuracyPct >= 30 ? "text-yellow-400" : "text-red-400"}`}>
                      {q.accuracyPct}% correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
