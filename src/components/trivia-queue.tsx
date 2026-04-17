"use client";

import { useState, useEffect, useCallback } from "react";

interface Pool {
  id: string;
  name: string;
}

interface QueueItem {
  questionId: string;
  question: string;
  category: string;
  difficulty: string;
  sortOrder: number;
  status: "pending" | "active" | "completed";
  activatedAt: string | null;
  completedAt: string | null;
  pickNumber: number | null;
}

interface AvailableQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
}

const diffColor: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

const statusColor: Record<string, string> = {
  pending: "bg-white/10 text-white/50",
  active: "bg-orange-500/20 text-orange-400",
  completed: "bg-green-500/20 text-green-400/60",
};

export function TriviaQueue() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [available, setAvailable] = useState<AvailableQuestion[]>([]);
  const [filterCat, setFilterCat] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Fetch pools the user can manage
  useEffect(() => {
    async function fetchPools() {
      try {
        const res = await fetch("/api/pools");
        const data = await res.json();
        const poolList = data.pools || data || [];
        setPools(poolList);
        if (poolList.length > 0) setSelectedPoolId(poolList[0].id);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchPools();
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!selectedPoolId) return;
    const res = await fetch(`/api/pools/${selectedPoolId}/trivia/queue`);
    const data = await res.json();
    setQueue(data.queue || []);
  }, [selectedPoolId]);

  const fetchAvailable = useCallback(async () => {
    if (!selectedPoolId) return;
    const params = new URLSearchParams({ limit: "200" });
    if (filterCat) params.set("category", filterCat);
    if (filterDiff) params.set("difficulty", filterDiff);
    if (searchText) params.set("search", searchText);
    const res = await fetch(`/api/trivia/questions?${params}`);
    const data = await res.json();
    if (data.categories) setCategories(data.categories);
    // Filter out questions already in queue
    const queueIds = new Set(queue.map((q) => q.questionId));
    setAvailable(
      (data.questions || []).filter((q: AvailableQuestion) => !queueIds.has(q.id))
    );
  }, [selectedPoolId, filterCat, filterDiff, searchText, queue]);

  useEffect(() => {
    if (selectedPoolId) {
      fetchQueue();
    }
  }, [selectedPoolId, fetchQueue]);

  useEffect(() => {
    if (selectedPoolId) fetchAvailable();
  }, [fetchAvailable, selectedPoolId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  async function addToQueue(questionId: string) {
    if (!selectedPoolId) return;
    setBusy(true);
    const res = await fetch(`/api/pools/${selectedPoolId}/trivia/queue/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    if (res.ok) showToast("Added to queue");
    await fetchQueue();
    setBusy(false);
  }

  async function removeFromQueue(questionId: string) {
    if (!selectedPoolId) return;
    setBusy(true);
    await fetch(`/api/pools/${selectedPoolId}/trivia/queue/${questionId}`, {
      method: "DELETE",
    });
    showToast("Removed from queue");
    await fetchQueue();
    setBusy(false);
  }

  async function moveInQueue(questionId: string, newSortOrder: number) {
    if (!selectedPoolId) return;
    setBusy(true);
    await fetch(`/api/pools/${selectedPoolId}/trivia/queue/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, newSortOrder }),
    });
    await fetchQueue();
    setBusy(false);
  }

  async function addAllUnused() {
    if (!selectedPoolId || available.length === 0) return;
    if (!confirm(`Add ${available.length} questions to the queue?`)) return;
    setBusy(true);
    const maxOrder = queue.length > 0 ? Math.max(...queue.map((q) => q.sortOrder)) : 0;
    // Shuffle available for random order
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const items = shuffled.map((q, i) => ({ questionId: q.id, sortOrder: maxOrder + 1 + i }));
    const res = await fetch(`/api/pools/${selectedPoolId}/trivia/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: items }),
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Added ${data.added ?? items.length} questions to queue`);
    }
    await fetchQueue();
    setBusy(false);
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const completedCount = queue.filter((q) => q.status === "completed").length;

  if (loading) {
    return <div className="text-center py-8 text-white/40 text-sm">Loading...</div>;
  }

  if (pools.length === 0) {
    return <div className="text-center py-8 text-white/40 text-sm">No pools found. Create a pool first.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Pool Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/50">Pool:</label>
        <select
          value={selectedPoolId}
          onChange={(e) => setSelectedPoolId(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#FFB612] focus:outline-none"
        >
          {pools.map((p) => (
            <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
          ))}
        </select>
        <span className="text-xs text-white/50 ml-auto">
          {queue.length} questions queued — enough for {queue.length} picks
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Available Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Available Questions</h3>
            <span className="text-xs text-white/50">{available.length} available</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-[#FFB612] focus:outline-none flex-1 min-w-[120px]"
            />
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-[#FFB612] focus:outline-none"
            >
              <option value="" className="bg-gray-900">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c} className="bg-gray-900">{c.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              value={filterDiff}
              onChange={(e) => setFilterDiff(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-[#FFB612] focus:outline-none"
            >
              <option value="" className="bg-gray-900">All</option>
              <option value="easy" className="bg-gray-900">Easy</option>
              <option value="medium" className="bg-gray-900">Medium</option>
              <option value="hard" className="bg-gray-900">Hard</option>
            </select>
            <button
              onClick={addAllUnused}
              disabled={busy || available.length === 0}
              className="rounded-lg bg-[#FFB612] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FFB612]/80 transition disabled:opacity-50"
            >
              Add All Unused ({available.length})
            </button>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {available.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                {queue.length > 0 ? "All questions are in the queue!" : "No questions match filters."}
              </div>
            ) : (
              available.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/8 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate">{q.question}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${diffColor[q.difficulty] || "bg-white/10 text-white/50"}`}>
                    {q.difficulty}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#FFB612]/20 px-1.5 py-0.5 text-[9px] text-[#FFB612]">
                    {q.category.replace(/_/g, " ")}
                  </span>
                  <button
                    onClick={() => addToQueue(q.id)}
                    disabled={busy}
                    className="shrink-0 rounded-lg border border-[#FFB612]/30 px-2 py-1 text-[10px] font-semibold text-[#FFB612] hover:bg-[#FFB612]/10 transition disabled:opacity-50"
                  >
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Queue Order */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Queue Order</h3>
              {queue.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-green-400/60">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2 2 4-4" /></svg>
                  auto-saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchQueue().then(() => showToast("Queue is up to date")); }}
                disabled={busy || queue.length === 0}
                className="rounded-lg bg-green-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-green-700 transition disabled:opacity-40"
              >
                Save Queue
              </button>
              <span className="text-xs text-white/50">
                {pendingCount} pending · {completedCount} completed
              </span>
            </div>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {queue.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                No questions in queue. Add questions from the left panel.
              </div>
            ) : (
              queue.map((q, i) => {
                const isLocked = q.status !== "pending";
                return (
                  <div
                    key={q.questionId}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      isLocked ? "border-white/8 bg-white/[0.02] opacity-60" : "border-white/[0.12] bg-white/8"
                    }`}
                  >
                    {/* Position */}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/50">
                      {i + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 truncate">{q.question}</p>
                    </div>

                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${diffColor[q.difficulty] || "bg-white/10 text-white/50"}`}>
                      {q.difficulty}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#FFB612]/20 px-1.5 py-0.5 text-[9px] text-[#FFB612]">
                      {q.category.replace(/_/g, " ")}
                    </span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusColor[q.status]}`}>
                      {q.status}
                    </span>

                    {!isLocked && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => moveInQueue(q.questionId, Math.max(1, q.sortOrder - 1))}
                          disabled={busy || i === 0 || queue[i - 1]?.status !== "pending"}
                          className="rounded px-1 py-0.5 text-[10px] text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveInQueue(q.questionId, Math.min(queue.length, q.sortOrder + 1))}
                          disabled={busy || i === queue.length - 1}
                          className="rounded px-1 py-0.5 text-[10px] text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                          title="Move down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => removeFromQueue(q.questionId)}
                          disabled={busy}
                          className="rounded px-1 py-0.5 text-[10px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Remove from queue"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
