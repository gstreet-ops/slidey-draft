"use client";

import { useState, useEffect, useCallback } from "react";

type QueueItem = {
  questionId: string;
  question: string;
  category: string;
  difficulty: string;
  sortOrder: number;
  status: "pending" | "active" | "completed";
  pickNumber: number | null;
};

type TriviaSettings = {
  triviaTimerSeconds: number;
};

type RoundSummary = {
  id: string;
  label: string | null;
  category: string | null;
  questionCount: number;
  timerSeconds: number;
  isLightning: boolean;
  pointMultiplier: number;
  sortOrder: number;
  status: "pending" | "active" | "paused" | "completed";
  currentQuestionIndex: number;
  progress: string;
};

const diffColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

const ROUND_STATUS_PILL: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
};

/** Renders a round's stored category field: null → "Mixed", single → plain text, comma-list → chips. */
function RoundCategoryDisplay({ category }: { category: string | null }) {
  if (!category) return <span>Mixed</span>;
  const parts = category.split(",").map((c) => c.trim()).filter(Boolean);
  if (parts.length <= 1) return <span>{parts[0] ?? "Mixed"}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {parts.map((p) => (
        <span
          key={p}
          className="rounded-full bg-[#FFB612]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#FFB612]"
        >
          {p}
        </span>
      ))}
    </span>
  );
}

export function TriviaControlPanel({
  poolId,
  initialSettings,
}: {
  poolId: string;
  initialSettings: TriviaSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState("");

  // Rounds state
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [roundBusy, setRoundBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [createLabel, setCreateLabel] = useState("");
  const [createCategories, setCreateCategories] = useState<string[]>([]);
  const [createQCount, setCreateQCount] = useState<number>(10);
  const [createTimer, setCreateTimer] = useState<number>(20);
  const [createLightning, setCreateLightning] = useState(false);

  const fetchQueue = useCallback(async () => {
    const res = await fetch(`/api/pools/${poolId}/trivia/queue`);
    const data = await res.json();
    setQueue(data.queue || []);
    setLoading(false);
  }, [poolId]);

  const fetchRounds = useCallback(async () => {
    const res = await fetch(`/api/pools/${poolId}/trivia/rounds`);
    const data = await res.json();
    setRounds(data.rounds || []);
  }, [poolId]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch(`/api/trivia/categories`);
    const data = await res.json();
    const list: string[] = (data.categories || []).map((c: { name: string }) => c.name);
    setCategories(list);
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchRounds();
    fetchCategories();
    const interval = setInterval(() => {
      fetchQueue();
      fetchRounds();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchRounds, fetchCategories]);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function updateTimer(seconds: number) {
    const res = await fetch(`/api/pools/${poolId}/trivia/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triviaTimerSeconds: seconds }),
    });
    const data = await res.json();
    if (data.success) {
      setSettings((prev) => ({ ...prev, triviaTimerSeconds: data.settings.triviaTimerSeconds }));
      showToastMsg("Timer updated");
    }
  }

  async function fireNext() {
    setFiring(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timerSeconds: settings.triviaTimerSeconds }),
    });
    const data = await res.json();
    if (data.success) {
      showToastMsg(`Fired Q${data.question?.sortOrder ?? "?"} (Pick #${data.question?.pickNumber ?? "?"})`);
      fetchQueue();
    } else {
      showToastMsg(data.error || "No more questions");
    }
    setFiring(false);
  }

  async function skipCurrent() {
    setSkipping(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.success) {
      showToastMsg("Question skipped");
      fetchQueue();
    }
    setSkipping(false);
  }

  async function createRound() {
    setRoundBusy(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: createLabel.trim() || undefined,
        categories: createCategories.length > 0 ? createCategories : undefined,
        questionCount: createQCount,
        timerSeconds: createTimer,
        isLightning: createLightning,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToastMsg(`Round "${data.round?.label || "Round"}" created`);
      setCreateLabel("");
      setCreateCategories([]);
      setShowCreate(false);
      fetchRounds();
    } else {
      showToastMsg(data.error || "Failed to create round");
    }
    setRoundBusy(false);
  }

  async function fireRound(roundId: string) {
    setRoundBusy(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/rounds/${roundId}/fire`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToastMsg("Round started");
      fetchRounds();
      fetchQueue();
    } else {
      showToastMsg(data.error || "Failed to fire round");
    }
    setRoundBusy(false);
  }

  async function pauseRound(roundId: string) {
    setRoundBusy(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/rounds/${roundId}/pause`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToastMsg("Round paused");
      fetchRounds();
    } else {
      showToastMsg(data.error || "Failed to pause");
    }
    setRoundBusy(false);
  }

  async function resumeRound(roundId: string) {
    setRoundBusy(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/rounds/${roundId}/resume`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToastMsg(data.completed ? "Round completed" : "Round resumed");
      fetchRounds();
      fetchQueue();
    } else {
      showToastMsg(data.error || "Failed to resume");
    }
    setRoundBusy(false);
  }

  async function skipRound(roundId: string, label: string | null) {
    if (!confirm(`Skip round${label ? ` "${label}"` : ""}? This marks all remaining questions complete.`)) return;
    setRoundBusy(true);
    const res = await fetch(`/api/pools/${poolId}/trivia/rounds/${roundId}/skip`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToastMsg("Round skipped");
      fetchRounds();
      fetchQueue();
    } else {
      showToastMsg(data.error || "Failed to skip");
    }
    setRoundBusy(false);
  }

  const activeItem = queue.find((q) => q.status === "active");
  const pendingItems = queue.filter((q) => q.status === "pending");
  const completedCount = queue.filter((q) => q.status === "completed").length;
  const totalCount = queue.length;
  const currentPosition = activeItem ? activeItem.sortOrder : completedCount;
  const nextThree = pendingItems.slice(0, 3);

  const activeRound = rounds.find((r) => r.status === "active" || r.status === "paused") || null;
  const nextPendingRound = rounds.find((r) => r.status === "pending") || null;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#FFB612] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-lg">
          {toast}
          <button onClick={() => setToast("")} className="ml-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">&times;</button>
        </div>
      )}

      {/* ── Rounds Section ────────────────────────────── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Rounds</span>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition"
          >
            {showCreate ? "Cancel" : "+ New Round"}
          </button>
        </div>

        {/* Active / paused round card */}
        {activeRound ? (
          <div className={`rounded-lg border px-4 py-3 space-y-2 ${activeRound.status === "paused" ? "border-yellow-200 bg-yellow-50" : activeRound.isLightning ? "border-amber-300 bg-amber-50" : "border-green-200 bg-green-50"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROUND_STATUS_PILL[activeRound.status]}`}>
                  {activeRound.status}
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                  {activeRound.label || `Round ${activeRound.sortOrder}`}
                </span>
                {activeRound.isLightning && (
                  <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">⚡ {activeRound.pointMultiplier}×</span>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">{activeRound.progress}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 flex-wrap">
              <RoundCategoryDisplay category={activeRound.category} />
              <span>· {activeRound.questionCount} Qs · {activeRound.timerSeconds}s</span>
            </div>
            <div className="flex items-center gap-2">
              {activeRound.status === "active" && (
                <button
                  onClick={() => pauseRound(activeRound.id)}
                  disabled={roundBusy}
                  className="rounded-lg border border-yellow-200 bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-200 transition disabled:opacity-50"
                >
                  Pause
                </button>
              )}
              {activeRound.status === "paused" && (
                <button
                  onClick={() => resumeRound(activeRound.id)}
                  disabled={roundBusy}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-green-500 transition disabled:opacity-50"
                >
                  Resume
                </button>
              )}
              <button
                onClick={() => skipRound(activeRound.id, activeRound.label)}
                disabled={roundBusy}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-50"
              >
                Skip Round
              </button>
            </div>
          </div>
        ) : nextPendingRound ? (
          <div className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Next up</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {nextPendingRound.label || `Round ${nextPendingRound.sortOrder}`}
                {nextPendingRound.isLightning && (
                  <span className="ml-2 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">⚡ {nextPendingRound.pointMultiplier}×</span>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 flex-wrap">
                <RoundCategoryDisplay category={nextPendingRound.category} />
                <span>· {nextPendingRound.questionCount} Qs · {nextPendingRound.timerSeconds}s</span>
              </div>
            </div>
            <button
              onClick={() => fireRound(nextPendingRound.id)}
              disabled={roundBusy}
              className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-orange-600 transition disabled:opacity-50"
            >
              Fire Next Round
            </button>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] px-4 py-3">No rounds queued — create one to get started.</div>
        )}

        {/* Remaining queue preview */}
        {rounds.filter((r) => r.status === "pending" && r.id !== nextPendingRound?.id).length > 0 && (
          <div className="text-[11px] text-[var(--text-muted)] px-1">
            Queued: {rounds
              .filter((r) => r.status === "pending" && r.id !== nextPendingRound?.id)
              .map((r) => r.label || `Round ${r.sortOrder}`)
              .join(" · ")}
          </div>
        )}

        {/* Create Round form */}
        {showCreate && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Label (optional)</label>
              <input
                type="text"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                placeholder="e.g. Halftime Blitz"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--steelers-gold)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = createCategories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setCreateCategories((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition ${
                        selected
                          ? "bg-[#FFB612] text-[var(--text-primary)] border border-[#FFB612]"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {createCategories.length === 0 && (
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">No filter = mixed from all categories</p>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Questions</label>
                <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                  {[5, 8, 10, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCreateQCount(n)}
                      className={`flex-1 py-1.5 text-xs font-semibold transition ${
                        createQCount === n
                          ? "bg-[#FFB612] text-[var(--text-primary)]"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Timer</label>
                <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                  {[15, 20, 30].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCreateTimer(n)}
                      className={`flex-1 py-1.5 text-xs font-semibold transition ${
                        createTimer === n
                          ? "bg-[#FFB612] text-[var(--text-primary)]"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {n}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createLightning}
                onChange={(e) => setCreateLightning(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              <span className="text-xs font-semibold text-[var(--text-primary)]">⚡ Lightning Round</span>
              {createLightning && (
                <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">2× POINTS</span>
              )}
            </label>
            <button
              onClick={createRound}
              disabled={roundBusy}
              className="w-full rounded-lg bg-[#FFB612] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[#FFB612]/90 transition disabled:opacity-50"
            >
              {roundBusy ? "Creating..." : "Create Round"}
            </button>
          </div>
        )}
      </div>

      {/* Current Question Display */}
      {activeItem ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
              Current Question — Q{currentPosition} of {totalCount}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffColor[activeItem.difficulty]}`}>
              {activeItem.difficulty}
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">{activeItem.question}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#FFB612]/20 px-2 py-0.5 text-[10px] text-[#FFB612]">
              {activeItem.category.replace(/_/g, " ")}
            </span>
            {activeItem.pickNumber != null && (
              <span className="text-[10px] text-[var(--text-muted)]">Pick #{activeItem.pickNumber}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <span className="text-xs text-[var(--text-muted)]">
            {pendingItems.length > 0
              ? "No active question — fire the next one below"
              : "Queue exhausted — no more trivia questions"}
          </span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Timer</span>
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {[0, 15, 30, 45, 60].map((s) => (
              <button
                key={s}
                onClick={() => updateTimer(s)}
                className={`px-2.5 py-1 text-xs font-semibold transition ${
                  settings.triviaTimerSeconds === s
                    ? "bg-[#FFB612] text-[var(--text-primary)]"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {s === 0 ? "Off" : `${s}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Fire / Skip / Pause */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={async () => {
              const next = !paused;
              setPaused(next);
              await fetch(`/api/pools/${poolId}/trivia/settings`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ triviaPaused: next }),
              });
              showToastMsg(next ? "Trivia paused" : "Trivia resumed");
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              paused
                ? "border-yellow-200 bg-yellow-100 text-yellow-700"
                : "border-[var(--border)] text-[var(--text-muted)] hover:bg-gray-50 hover:text-[var(--text-primary)]"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            onClick={skipCurrent}
            disabled={skipping || !activeItem}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition disabled:opacity-30"
          >
            {skipping ? "..." : "Skip"}
          </button>

          <button
            onClick={fireNext}
            disabled={firing || pendingItems.length === 0}
            className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-orange-600 transition disabled:opacity-50"
          >
            {firing ? "Firing..." : "Fire Next"}
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] w-full sm:w-auto">
          {pendingItems.length} pending / {totalCount} total
        </div>
      </div>

      {/* Queue Preview (collapsible) */}
      {nextThree.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition"
          >
            <span>{showPreview ? "▾" : "▸"}</span>
            Next {nextThree.length} Questions
          </button>
          {showPreview && (
            <div className="space-y-1">
              {nextThree.map((q) => (
                <div
                  key={q.questionId}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] text-[9px] font-bold text-[var(--text-muted)]">
                    {q.sortOrder}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)] truncate">{q.question}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${diffColor[q.difficulty]}`}>
                    {q.difficulty}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#FFB612]/20 px-1.5 py-0.5 text-[9px] text-[#FFB612]">
                    {q.category.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
