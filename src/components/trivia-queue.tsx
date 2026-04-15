"use client";

import { useState, useEffect, useCallback } from "react";

interface QueueItem {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  sortOrder: number;
  firedAt: string | null;
}

interface AvailableItem {
  id: string;
  question: string;
  category: string;
  difficulty: string;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "draft_history", label: "Draft History" },
  { value: "combine", label: "Combine" },
  { value: "trades", label: "Trades" },
  { value: "general", label: "General" },
  { value: "2026_draft", label: "2026 Draft" },
];

const DIFFICULTIES = [
  { value: "", label: "All Difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const diffColor: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

export function TriviaQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [available, setAvailable] = useState<AvailableItem[]>([]);
  const [filterCat, setFilterCat] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/admin/trivia/queue");
    const data = await res.json();
    setQueue(data.queue);
  }, []);

  const fetchAvailable = useCallback(async () => {
    const params = new URLSearchParams({ limit: "1000" });
    if (filterCat) params.set("category", filterCat);
    if (filterDiff) params.set("difficulty", filterDiff);
    const res = await fetch(`/api/admin/trivia?${params}`);
    const data = await res.json();
    // Filter out questions already in queue
    const queueIds = new Set(queue.map((q) => q.id));
    setAvailable(
      data.questions.filter((q: AvailableItem & { id: string; sortOrder?: number | null }) => !queueIds.has(q.id) && q.sortOrder == null)
    );
  }, [filterCat, filterDiff, queue]);

  useEffect(() => {
    fetchQueue().then(() => setLoading(false));
  }, [fetchQueue]);

  useEffect(() => {
    if (!loading) fetchAvailable();
  }, [fetchAvailable, loading]);

  async function addToQueue(questionId: string) {
    setBusy(true);
    await fetch("/api/admin/trivia/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "add" }),
    });
    await fetchQueue();
    setBusy(false);
  }

  async function removeFromQueue(questionId: string) {
    setBusy(true);
    await fetch("/api/admin/trivia/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "remove" }),
    });
    await fetchQueue();
    setBusy(false);
  }

  async function moveInQueue(questionId: string, newPosition: number) {
    setBusy(true);
    await fetch("/api/admin/trivia/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "reorder", position: newPosition }),
    });
    await fetchQueue();
    setBusy(false);
  }

  async function addAllFiltered() {
    if (available.length === 0) return;
    if (!confirm(`Add ${available.length} questions to the queue?`)) return;
    setBusy(true);
    // Add current queue IDs + new ones
    const allIds = [...queue.map((q) => q.id), ...available.map((q) => q.id)];
    await fetch("/api/admin/trivia/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: allIds }),
    });
    await fetchQueue();
    setBusy(false);
  }

  const backupCount = Math.max(0, queue.length - 32);

  if (loading) {
    return <div className="text-center py-8 text-white/30 text-sm">Loading queue...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Draft Night Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Draft Night Queue</h3>
          <span className="text-xs text-white/40">
            {queue.length} question{queue.length !== 1 ? "s" : ""}
            {queue.length > 0 && (
              <> (32 picks{backupCount > 0 ? ` + ${backupCount} backup` : ""})</>
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all ${queue.length >= 32 ? "bg-green-500" : queue.length >= 20 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(100, (queue.length / 32) * 100)}%` }}
          />
        </div>

        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              No questions in queue. Add questions from the right panel.
            </div>
          ) : (
            queue.map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  q.firedAt
                    ? "border-white/5 bg-white/[0.02] opacity-50"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {/* Position number */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/50">
                  {i + 1}
                </span>

                {/* Question text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/80 truncate">{q.question}</p>
                </div>

                {/* Badges */}
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${diffColor[q.difficulty] || "bg-white/10 text-white/40"}`}>
                  {q.difficulty}
                </span>
                <span className="shrink-0 rounded-full bg-[#0076B6]/20 px-1.5 py-0.5 text-[9px] text-[#0076B6]">
                  {q.category.replace(/_/g, " ")}
                </span>

                {/* Controls */}
                {!q.firedAt && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => moveInQueue(q.id, Math.max(1, q.sortOrder - 1))}
                      disabled={busy || i === 0}
                      className="rounded px-1 py-0.5 text-[10px] text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveInQueue(q.id, Math.min(queue.length, q.sortOrder + 1))}
                      disabled={busy || i === queue.length - 1}
                      className="rounded px-1 py-0.5 text-[10px] text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => removeFromQueue(q.id)}
                      disabled={busy}
                      className="rounded px-1 py-0.5 text-[10px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Remove from queue"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {q.firedAt && (
                  <span className="shrink-0 text-[9px] text-green-400/50">fired</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Available Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Available Questions</h3>
          <span className="text-xs text-white/40">{available.length} available</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-[#0076B6] focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
            ))}
          </select>
          <select
            value={filterDiff}
            onChange={(e) => setFilterDiff(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-[#0076B6] focus:outline-none"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
            ))}
          </select>
          <button
            onClick={addAllFiltered}
            disabled={busy || available.length === 0}
            className="ml-auto rounded-lg bg-[#0076B6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0076B6]/80 transition disabled:opacity-50"
          >
            Add All ({available.length})
          </button>
        </div>

        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {available.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              {queue.length > 0 ? "All questions are in the queue!" : "No questions match filters."}
            </div>
          ) : (
            available.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/80 truncate">{q.question}</p>
                </div>

                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${diffColor[q.difficulty] || "bg-white/10 text-white/40"}`}>
                  {q.difficulty}
                </span>
                <span className="shrink-0 rounded-full bg-[#0076B6]/20 px-1.5 py-0.5 text-[9px] text-[#0076B6]">
                  {q.category.replace(/_/g, " ")}
                </span>

                <button
                  onClick={() => addToQueue(q.id)}
                  disabled={busy}
                  className="shrink-0 rounded-lg border border-[#0076B6]/30 px-2 py-1 text-[10px] font-semibold text-[#0076B6] hover:bg-[#0076B6]/10 transition disabled:opacity-50"
                >
                  + Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
