"use client";

import { useState, useEffect, useCallback } from "react";
import { TriviaQueue } from "@/components/trivia-queue";

interface Question {
  id?: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  category: string;
  difficulty: string;
  createdAt?: string;
  usedAt?: string | null;
}

const CATEGORIES = [
  { value: "draft_history", label: "Draft History" },
  { value: "combine", label: "Combine" },
  { value: "trades", label: "Trades" },
  { value: "general", label: "General" },
  { value: "2026_draft", label: "2026 Draft" },
  { value: "custom", label: "Custom Topic" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

const COUNTS = [5, 10, 15, 20];

export default function AdminTriviaPage() {
  // Generator state
  const [category, setCategory] = useState("draft_history");
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Library state
  const [library, setLibrary] = useState<Question[]>([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryPages, setLibraryPages] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ byCategory: Record<string, number>; byDifficulty: Record<string, number> }>({ byCategory: {}, byDifficulty: {} });

  const fetchLibrary = useCallback(async () => {
    const params = new URLSearchParams({ page: String(libraryPage), limit: "50" });
    if (filterCategory) params.set("category", filterCategory);
    if (filterDifficulty) params.set("difficulty", filterDifficulty);
    const res = await fetch(`/api/admin/trivia?${params}`);
    const data = await res.json();
    setLibrary(data.questions);
    setLibraryTotal(data.total);
    setLibraryPages(data.pages);
  }, [libraryPage, filterCategory, filterDifficulty]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/trivia?limit=1000");
    const data = await res.json();
    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    data.questions.forEach((q: Question) => {
      byCategory[q.category] = (byCategory[q.category] || 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    });
    setStats({ byCategory, byDifficulty });
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleGenerate() {
    setGenerating(true);
    setGenerated([]);
    try {
      const res = await fetch("/api/admin/trivia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, difficulty, count, customTopic: category === "custom" ? customTopic : undefined }),
      });
      const data = await res.json();
      if (data.error) {
        setToast(`Error: ${data.error}`);
      } else {
        setGenerated(data.questions);
        setSelected(new Set(data.questions.map((_: Question, i: number) => i)));
      }
    } catch {
      setToast("Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(indices: number[]) {
    setSaving(true);
    const questions = indices.map((i) => generated[i]);
    try {
      const res = await fetch("/api/admin/trivia/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      setToast(`Saved ${data.saved} questions!`);
      setGenerated([]);
      setSelected(new Set());
      fetchLibrary();
      fetchStats();
    } catch {
      setToast("Failed to save questions");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    await fetch("/api/admin/trivia", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchLibrary();
    fetchStats();
  }

  function updateGenerated(index: number, field: keyof Question, value: string) {
    setGenerated((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  }

  return (
    <div className="space-y-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#0076B6] px-5 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in">
          {toast}
          <button onClick={() => setToast("")} className="ml-3 text-white/70 hover:text-white">&times;</button>
        </div>
      )}

      {/* Generator Section */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          AI TRIVIA GENERATOR
        </h1>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
              ))}
            </select>
          </div>

          {category === "custom" && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-white/50 mb-1">Custom Topic</label>
              <input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Quarterback busts of the 2000s"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#0076B6] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-white/50 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Count</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
            >
              {COUNTS.map((n) => (
                <option key={n} value={n} className="bg-gray-900">{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating || (category === "custom" && !customTopic)}
              className="rounded-lg bg-[#0076B6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0076B6]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Generating...
                </span>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>

        {/* Generated Questions */}
        {generated.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{generated.length} Questions Generated</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(Array.from(selected))}
                  disabled={saving || selected.size === 0}
                  className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : `Save Selected (${selected.size})`}
                </button>
                <button
                  onClick={() => handleSave(generated.map((_, i) => i))}
                  disabled={saving}
                  className="rounded-lg bg-[#0076B6] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0076B6]/80 transition disabled:opacity-50"
                >
                  Save All
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {generated.map((q, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        e.target.checked ? next.add(i) : next.delete(i);
                        setSelected(next);
                      }}
                      className="mt-1 h-4 w-4 accent-[#0076B6]"
                    />
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={q.question}
                        onChange={(e) => updateGenerated(i, "question", e.target.value)}
                        rows={2}
                        className="w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#0076B6] focus:outline-none resize-none"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const key = `option${letter}` as keyof Question;
                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${i}`}
                                checked={q.correctOption === letter.toLowerCase()}
                                onChange={() => updateGenerated(i, "correctOption", letter.toLowerCase())}
                                className="accent-green-500"
                              />
                              <span className="text-xs text-white/40 w-4">{letter}.</span>
                              <input
                                value={q[key] as string}
                                onChange={(e) => updateGenerated(i, key, e.target.value)}
                                className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white focus:border-[#0076B6] focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#0076B6]/20 px-2 py-0.5 text-xs text-[#0076B6]">{q.category}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">{q.difficulty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setGenerated((prev) => prev.filter((_, j) => j !== i))}
                      className="text-red-400/60 hover:text-red-400 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Draft Night Queue */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-6 space-y-6">
        <h2 className="text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          DRAFT NIGHT QUEUE
        </h2>
        <p className="text-sm text-white/40">
          Arrange questions in the order they&apos;ll auto-fire during the draft. The auto-fire system picks the next question by sort order.
        </p>
        <TriviaQueue />
      </div>

      {/* Question Library */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-6 space-y-6">
        <h2 className="text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          QUESTION LIBRARY
        </h2>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-2">
            <span className="text-white/50">Total:</span>{" "}
            <span className="text-white font-semibold">{libraryTotal}</span>
          </div>
          {Object.entries(stats.byCategory).map(([cat, n]) => (
            <div key={cat} className="rounded-lg bg-[#0076B6]/10 border border-[#0076B6]/20 px-3 py-2">
              <span className="text-[#0076B6]/70">{cat}:</span>{" "}
              <span className="text-white font-semibold">{n}</span>
            </div>
          ))}
          {Object.entries(stats.byDifficulty).map(([diff, n]) => (
            <div key={diff} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <span className="text-white/40">{diff}:</span>{" "}
              <span className="text-white font-semibold">{n}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setLibraryPage(1); }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#0076B6] focus:outline-none"
          >
            <option value="" className="bg-gray-900">All Categories</option>
            {CATEGORIES.filter((c) => c.value !== "custom").map((c) => (
              <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => { setFilterDifficulty(e.target.value); setLibraryPage(1); }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#0076B6] focus:outline-none"
          >
            <option value="" className="bg-gray-900">All Difficulties</option>
            {DIFFICULTIES.filter((d) => d.value !== "mixed").map((d) => (
              <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="space-y-2">
          {library.map((q) => (
            <div key={q.id} className="rounded-lg border border-white/10 bg-white/5">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id!)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{q.question}</p>
                </div>
                <span className="rounded-full bg-[#0076B6]/20 px-2 py-0.5 text-xs text-[#0076B6] shrink-0">{q.category}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60 shrink-0">{q.difficulty}</span>
                <span className="text-xs text-white/30 shrink-0 w-20 text-right">
                  {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ""}
                </span>
                {q.usedAt && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400 shrink-0">Used</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(q.id!); }}
                  className="text-red-400/40 hover:text-red-400 text-xs shrink-0"
                >
                  Delete
                </button>
              </div>
              {expandedId === q.id && (
                <div className="border-t border-white/5 px-4 py-3 space-y-1 text-sm">
                  <p className="text-white/80">{q.question}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <p className={q.correctOption === "a" ? "text-green-400" : "text-white/50"}>A. {q.optionA}</p>
                    <p className={q.correctOption === "b" ? "text-green-400" : "text-white/50"}>B. {q.optionB}</p>
                    <p className={q.correctOption === "c" ? "text-green-400" : "text-white/50"}>C. {q.optionC}</p>
                    <p className={q.correctOption === "d" ? "text-green-400" : "text-white/50"}>D. {q.optionD}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {library.length === 0 && (
            <div className="text-center py-8 text-white/40 text-sm">No questions found.</div>
          )}
        </div>

        {/* Pagination */}
        {libraryPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
              disabled={libraryPage <= 1}
              className="rounded px-3 py-1 text-sm text-white/50 hover:text-white disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-sm text-white/40">
              Page {libraryPage} of {libraryPages}
            </span>
            <button
              onClick={() => setLibraryPage((p) => Math.min(libraryPages, p + 1))}
              disabled={libraryPage >= libraryPages}
              className="rounded px-3 py-1 text-sm text-white/50 hover:text-white disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
