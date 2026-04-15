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

const diffColor: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

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

  const fetchQueue = useCallback(async () => {
    const res = await fetch(`/api/pools/${poolId}/trivia/queue`);
    const data = await res.json();
    setQueue(data.queue || []);
    setLoading(false);
  }, [poolId]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchQueue]);

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

  const activeItem = queue.find((q) => q.status === "active");
  const pendingItems = queue.filter((q) => q.status === "pending");
  const completedCount = queue.filter((q) => q.status === "completed").length;
  const totalCount = queue.length;
  const currentPosition = activeItem ? activeItem.sortOrder : completedCount;
  const nextThree = pendingItems.slice(0, 3);

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#0076B6] px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
          <button onClick={() => setToast("")} className="ml-3 text-white/70 hover:text-white">&times;</button>
        </div>
      )}

      {/* Current Question Display */}
      {activeItem ? (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              Current Question — Q{currentPosition} of {totalCount}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffColor[activeItem.difficulty]}`}>
              {activeItem.difficulty}
            </span>
          </div>
          <p className="text-sm text-white">{activeItem.question}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#0076B6]/20 px-2 py-0.5 text-[10px] text-[#0076B6]">
              {activeItem.category.replace(/_/g, " ")}
            </span>
            {activeItem.pickNumber != null && (
              <span className="text-[10px] text-white/30">Pick #{activeItem.pickNumber}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs text-white/40">
            {pendingItems.length > 0
              ? "No active question — fire the next one below"
              : "Queue exhausted — no more trivia questions"}
          </span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Timer</span>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {[0, 15, 30, 45, 60].map((s) => (
              <button
                key={s}
                onClick={() => updateTimer(s)}
                className={`px-2.5 py-1 text-xs font-semibold transition ${
                  settings.triviaTimerSeconds === s
                    ? "bg-[#0076B6] text-white"
                    : "bg-white/5 text-white/40 hover:text-white"
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
            onClick={() => setPaused(!paused)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              paused
                ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                : "border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            onClick={skipCurrent}
            disabled={skipping || !activeItem}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white transition disabled:opacity-30"
          >
            {skipping ? "..." : "Skip"}
          </button>

          <button
            onClick={fireNext}
            disabled={firing || pendingItems.length === 0}
            className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-600 transition disabled:opacity-50"
          >
            {firing ? "Firing..." : "Fire Next"}
          </button>
        </div>

        <div className="text-xs text-white/30 w-full sm:w-auto">
          {pendingItems.length} pending / {totalCount} total
        </div>
      </div>

      {/* Queue Preview (collapsible) */}
      {nextThree.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-wider hover:text-white/60 transition"
          >
            <span>{showPreview ? "▾" : "▸"}</span>
            Next {nextThree.length} Questions
          </button>
          {showPreview && (
            <div className="space-y-1">
              {nextThree.map((q) => (
                <div
                  key={q.questionId}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40">
                    {q.sortOrder}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50 truncate">{q.question}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${diffColor[q.difficulty]}`}>
                    {q.difficulty}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#0076B6]/20 px-1.5 py-0.5 text-[9px] text-[#0076B6]">
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
