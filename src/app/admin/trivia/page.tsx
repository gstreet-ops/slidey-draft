"use client";

import { useState, useEffect, useCallback } from "react";
import { TriviaQueue } from "@/components/trivia-queue";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
}

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const AI_CATEGORIES = [
  { value: "draft_history", label: "Draft History" },
  { value: "combine", label: "Combine" },
  { value: "trades", label: "Trades" },
  { value: "general", label: "General" },
  { value: "2026_draft", label: "2026 Draft" },
  { value: "custom", label: "Custom Topic" },
];

const AI_COUNTS = [5, 10, 15, 20];

const diffColor: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

export default function AdminTriviaPage() {
  // ── Create Question state ──
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    category: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
  });
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // ── AI Generator state ──
  const [aiCategory, setAiCategory] = useState("draft_history");
  const [customTopic, setCustomTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiCount, setAiCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [selectedGen, setSelectedGen] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // ── Library state ──
  const [library, setLibrary] = useState<Question[]>([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryPages, setLibraryPages] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const [toast, setToast] = useState("");

  const fetchLibrary = useCallback(async () => {
    const params = new URLSearchParams({ page: String(libraryPage), limit: "50", includeInactive: "true" });
    if (filterCategory) params.set("category", filterCategory);
    if (filterDifficulty) params.set("difficulty", filterDifficulty);
    if (searchText) params.set("search", searchText);
    const res = await fetch(`/api/trivia/questions?${params}`);
    const data = await res.json();
    setLibrary(data.questions);
    setLibraryTotal(data.total);
    setLibraryPages(data.pages);
    if (data.categories) setCategories(data.categories);
  }, [libraryPage, filterCategory, filterDifficulty, searchText]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── Create Question ──
  async function handleCreateQuestion() {
    if (!createForm.question || createForm.options.some((o) => !o) || !createForm.category) {
      showToast("Fill in all fields");
      return;
    }
    setCreatingQuestion(true);
    try {
      const res = await fetch("/api/trivia/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        showToast("Question created!");
        setShowCreate(false);
        setCreateForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, category: "", difficulty: "medium" });
        fetchLibrary();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create");
      }
    } catch {
      showToast("Failed to create question");
    } finally {
      setCreatingQuestion(false);
    }
  }

  // ── AI Generator ──
  async function handleGenerate() {
    setGenerating(true);
    setGenerated([]);
    try {
      const res = await fetch("/api/admin/trivia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: aiCategory, difficulty: aiDifficulty, count: aiCount, customTopic: aiCategory === "custom" ? customTopic : undefined }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(`Error: ${data.error}`);
      } else {
        setGenerated(data.questions);
        setSelectedGen(new Set(data.questions.map((_: unknown, i: number) => i)));
      }
    } catch {
      showToast("Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveGenerated(indices: number[]) {
    setSaving(true);
    const questions = indices.map((i) => generated[i]);
    try {
      const res = await fetch("/api/admin/trivia/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      showToast(`Saved ${data.saved} questions!`);
      setGenerated([]);
      setSelectedGen(new Set());
      fetchLibrary();
    } catch {
      showToast("Failed to save questions");
    } finally {
      setSaving(false);
    }
  }

  // ── Library actions ──
  async function handleToggleActive(q: Question) {
    await fetch(`/api/trivia/questions/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !q.active }),
    });
    fetchLibrary();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    await fetch("/api/admin/trivia", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchLibrary();
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

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: Question Bank
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            QUESTION BANK
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
            >
              {showCreate ? "Cancel" : "Create Question"}
            </button>
          </div>
        </div>

        {/* Create Question Form */}
        {showCreate && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">New Question</h3>
            <textarea
              value={createForm.question}
              onChange={(e) => setCreateForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Question text..."
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#0076B6] focus:outline-none resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["A", "B", "C", "D"].map((letter, i) => (
                <div key={letter} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-create"
                    checked={createForm.correctAnswer === i}
                    onChange={() => setCreateForm((f) => ({ ...f, correctAnswer: i }))}
                    className="accent-green-500"
                  />
                  <span className="text-xs text-white/40 w-4">{letter}.</span>
                  <input
                    value={createForm.options[i]}
                    onChange={(e) => {
                      const opts = [...createForm.options];
                      opts[i] = e.target.value;
                      setCreateForm((f) => ({ ...f, options: opts }));
                    }}
                    placeholder={`Option ${letter}`}
                    className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#0076B6] focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-white/50 mb-1">Category (freetext)</label>
                <input
                  value={createForm.category}
                  onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  list="category-list"
                  placeholder="e.g. nfl_history, pop_culture, inside_jokes..."
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#0076B6] focus:outline-none"
                />
                <datalist id="category-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Difficulty</label>
                <select
                  value={createForm.difficulty}
                  onChange={(e) => setCreateForm((f) => ({ ...f, difficulty: e.target.value as "easy" | "medium" | "hard" }))}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCreateQuestion}
                  disabled={creatingQuestion}
                  className="rounded-lg bg-[#0076B6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0076B6]/80 transition disabled:opacity-50"
                >
                  {creatingQuestion ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-3">
          <input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setLibraryPage(1); }}
            placeholder="Search questions..."
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#0076B6] focus:outline-none flex-1 min-w-[200px]"
          />
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setLibraryPage(1); }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#0076B6] focus:outline-none"
          >
            <option value="" className="bg-gray-900">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-gray-900">{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => { setFilterDifficulty(e.target.value); setLibraryPage(1); }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#0076B6] focus:outline-none"
          >
            <option value="" className="bg-gray-900">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
            ))}
          </select>
          <div className="text-xs text-white/40 self-center">{libraryTotal} questions</div>
        </div>

        {/* Question Table */}
        <div className="space-y-2">
          {library.map((q) => (
            <div key={q.id} className={`rounded-lg border ${q.active ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{q.question}</p>
                </div>
                <span className="rounded-full bg-[#0076B6]/20 px-2 py-0.5 text-xs text-[#0076B6] shrink-0">
                  {q.category.replace(/_/g, " ")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${diffColor[q.difficulty] || "bg-white/10 text-white/40"}`}>
                  {q.difficulty}
                </span>
                <span className="text-[10px] text-white/30 shrink-0">
                  {q.createdBy ? "Commissioner" : "System"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(q); }}
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold transition ${q.active ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"}`}
                >
                  {q.active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                  className="text-red-400/40 hover:text-red-400 text-xs shrink-0"
                >
                  Delete
                </button>
              </div>
              {expandedId === q.id && (
                <div className="border-t border-white/5 px-4 py-3 space-y-1 text-sm">
                  <p className="text-white/80">{q.question}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {(q.options as string[]).map((opt, i) => (
                      <p key={i} className={i === q.correctAnswer ? "text-green-400" : "text-white/50"}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </p>
                    ))}
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
            <span className="text-sm text-white/40">Page {libraryPage} of {libraryPages}</span>
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

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: Pool Queue Builder
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-6 space-y-6">
        <h2 className="text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          POOL QUEUE BUILDER
        </h2>
        <p className="text-sm text-white/40">
          Select a pool, then arrange questions in the order they&apos;ll fire during the draft.
        </p>
        <TriviaQueue />
      </div>

      {/* ═══════════════════════════════════════════════════════
          AI Generator (collapsible)
          ═══════════════════════════════════════════════════════ */}
      <details className="rounded-xl border border-white/10 bg-gray-900/60 p-6 space-y-6">
        <summary className="text-xl font-bold text-white tracking-wide cursor-pointer" style={{ fontFamily: "var(--font-display)" }}>
          AI TRIVIA GENERATOR
        </summary>

        <div className="space-y-6 pt-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Category</label>
              <select
                value={aiCategory}
                onChange={(e) => setAiCategory(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
              >
                {AI_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
                ))}
              </select>
            </div>

            {aiCategory === "custom" && (
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
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
              >
                {[...DIFFICULTIES, { value: "mixed", label: "Mixed" }].map((d) => (
                  <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Count</label>
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#0076B6] focus:outline-none"
              >
                {AI_COUNTS.map((n) => (
                  <option key={n} value={n} className="bg-gray-900">{n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={generating || (aiCategory === "custom" && !customTopic)}
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
                <h3 className="text-lg font-semibold text-white">{generated.length} Questions Generated</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveGenerated(Array.from(selectedGen))}
                    disabled={saving || selectedGen.size === 0}
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : `Save Selected (${selectedGen.size})`}
                  </button>
                  <button
                    onClick={() => handleSaveGenerated(generated.map((_, i) => i))}
                    disabled={saving}
                    className="rounded-lg bg-[#0076B6] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0076B6]/80 transition disabled:opacity-50"
                  >
                    Save All
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {generated.map((q, i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedGen.has(i)}
                        onChange={(e) => {
                          const next = new Set(selectedGen);
                          e.target.checked ? next.add(i) : next.delete(i);
                          setSelectedGen(next);
                        }}
                        className="mt-1 h-4 w-4 accent-[#0076B6]"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-white">{q.question}</p>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                          {(q.options as string[]).map((opt, j) => (
                            <p key={j} className={j === q.correctAnswer ? "text-green-400" : "text-white/50"}>
                              {String.fromCharCode(65 + j)}. {opt}
                            </p>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="rounded-full bg-[#0076B6]/20 px-2 py-0.5 text-xs text-[#0076B6]">{q.category}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${diffColor[q.difficulty] || "bg-white/10 text-white/40"}`}>{q.difficulty}</span>
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
      </details>
    </div>
  );
}
