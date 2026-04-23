"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Pencil, X } from "lucide-react";
import { TriviaQueue } from "@/components/trivia-queue";
import { TriviaExportModal } from "@/components/trivia-export-modal";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: string;
  active: boolean;
  createdBy: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
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

const SPORT_CONTEXTS = [
  { value: "nfl_draft", label: "NFL Draft" },
  { value: "nfl_general", label: "NFL General" },
  { value: "sports_general", label: "Sports General" },
];

const AI_COUNTS = [3, 5, 10, 15, 20];

// Sonnet 4 pricing: $3/MTok input, $15/MTok output
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const diffColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

type QuestionForm = {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  active: boolean;
};

const EMPTY_FORM: QuestionForm = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  category: "",
  difficulty: "medium",
  active: true,
};

export default function AdminTriviaPage() {
  // ── Question modal state (shared between create and edit) ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(EMPTY_FORM);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [showExport, setShowExport] = useState(false);

  // ── AI Generator state ──
  const [topicMode, setTopicMode] = useState<"topic_football" | "topic_only">("topic_football");
  const [sportContext, setSportContext] = useState("nfl_draft");
  const [aiCategory, setAiCategory] = useState("draft_history");
  const [customTopic, setCustomTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiCount, setAiCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [selectedGen, setSelectedGen] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [lastUsage, setLastUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [sessionCost, setSessionCost] = useState(0);

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

  function showToast(msg: string, persist = false) {
    setToast(msg);
    if (!persist) setTimeout(() => setToast(""), 3000);
  }

  // ── Create / Edit Question ──
  function openCreateModal() {
    setEditingQuestion(null);
    setQuestionForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(q: Question) {
    setEditingQuestion(q);
    const opts = Array.isArray(q.options) && q.options.length === 4
      ? [...q.options]
      : ["", "", "", ""];
    setQuestionForm({
      question: q.question,
      options: opts,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: (q.difficulty as "easy" | "medium" | "hard") || "medium",
      active: q.active,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingQuestion(null);
    setQuestionForm(EMPTY_FORM);
  }

  async function handleSubmitQuestion() {
    if (
      !questionForm.question.trim() ||
      questionForm.options.some((o) => !o.trim()) ||
      !questionForm.category.trim()
    ) {
      showToast("Fill in all fields");
      return;
    }
    setSavingQuestion(true);
    try {
      const isEdit = !!editingQuestion;
      const url = isEdit
        ? `/api/trivia/questions/${editingQuestion!.id}`
        : "/api/trivia/questions";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? JSON.stringify(questionForm)
        : JSON.stringify({
            question: questionForm.question,
            options: questionForm.options,
            correctAnswer: questionForm.correctAnswer,
            category: questionForm.category,
            difficulty: questionForm.difficulty,
          });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        showToast(isEdit ? "Question updated" : "Question created!");
        closeModal();
        fetchLibrary();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || (isEdit ? "Failed to update" : "Failed to create"));
      }
    } catch {
      showToast(editingQuestion ? "Failed to update question" : "Failed to create question");
    } finally {
      setSavingQuestion(false);
    }
  }

  // ── AI Generator ──
  async function handleGenerate() {
    setGenerating(true);
    setGenerated([]);
    setLastUsage(null);
    try {
      const res = await fetch("/api/admin/trivia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: aiCategory,
          difficulty: aiDifficulty,
          count: aiCount,
          customTopic: aiCategory === "custom" ? customTopic : undefined,
          topicMode,
          sportContext: topicMode === "topic_football" ? sportContext : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(`Error: ${data.error}`, true);
      } else {
        setGenerated(data.questions);
        setSelectedGen(new Set(data.questions.map((_: unknown, i: number) => i)));
        if (data.usage) {
          setLastUsage(data.usage);
          const cost = data.usage.inputTokens * COST_PER_INPUT_TOKEN + data.usage.outputTokens * COST_PER_OUTPUT_TOKEN;
          setSessionCost((prev) => prev + cost);
        }
      }
    } catch (e) {
      showToast(`Failed to generate questions: ${e instanceof Error ? e.message : "network error"}`, true);
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
    if (q.active) {
      const ok = confirm(
        "Deactivate this question?\n\nIf it's currently queued in any pool, it will remain in that queue but won't be eligible for new pools."
      );
      if (!ok) return;
    }
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

  function formatCost(dollars: number) {
    if (dollars < 0.01) return `~$${(dollars * 100).toFixed(2)}c`;
    return `~$${dollars.toFixed(3)}`;
  }

  function creatorLabel(q: Question): string {
    if (!q.createdBy) return "System";
    return q.createdByName || q.createdByEmail || "Commissioner";
  }

  return (
    <div className="space-y-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-lg animate-in fade-in max-w-md ${toast.startsWith("Error") || toast.startsWith("Failed") ? "bg-red-600" : "bg-[#FFB612]"}`}>
          {toast}
          <button onClick={() => setToast("")} className="ml-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">&times;</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Pool Queue Builder
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          POOL QUEUE BUILDER
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Select a pool, then arrange questions in the order they&apos;ll fire during the draft.
        </p>
        <TriviaQueue />
      </div>

      {/* ═══════════════════════════════════════════════════════
          Question Bank
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            QUESTION BANK
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition"
            >
              <Download size={14} />
              Export Questions
            </button>
            <button
              onClick={openCreateModal}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-green-700 transition"
            >
              Create Question
            </button>
          </div>
        </div>

        <TriviaExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          onToast={(msg) => showToast(msg)}
        />

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-3">
          <input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setLibraryPage(1); }}
            placeholder="Search questions..."
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none flex-1 min-w-[200px]"
          />
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setLibraryPage(1); }}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
          >
            <option value="" className="bg-[var(--bg-card)]">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-[var(--bg-card)]">{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => { setFilterDifficulty(e.target.value); setLibraryPage(1); }}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
          >
            <option value="" className="bg-[var(--bg-card)]">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">{d.label}</option>
            ))}
          </select>
          <div className="text-xs text-[var(--text-muted)] self-center">{libraryTotal} questions</div>
        </div>

        {/* Question Table */}
        <div className="space-y-2">
          {library.map((q) => (
            <div key={q.id} className={`rounded-lg border ${q.active ? "border-[var(--border)] bg-[var(--bg-card)]" : "border-[var(--border-light)] bg-[var(--bg-card)] opacity-60"}`}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{q.question}</p>
                </div>
                <span className="rounded-full bg-[#FFB612]/20 px-2 py-0.5 text-xs text-[#FFB612] shrink-0">
                  {q.category.replace(/_/g, " ")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${diffColor[q.difficulty] || "bg-[var(--bg-card)] text-[var(--text-muted)]"}`}>
                  {q.difficulty}
                </span>
                {q.createdBy === null ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    System
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-[var(--text-muted)] max-w-[120px] truncate" title={creatorLabel(q)}>
                    {creatorLabel(q)}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); openEditModal(q); }}
                  className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:bg-gray-100 hover:text-[var(--text-primary)] transition"
                  title="Edit question"
                  aria-label="Edit question"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(q); }}
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold transition ${q.active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}
                >
                  {q.active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                  className="text-red-700/40 hover:text-red-700 text-xs shrink-0"
                >
                  Delete
                </button>
              </div>
              {expandedId === q.id && (
                <div className="border-t border-[var(--border-light)] px-4 py-3 space-y-1 text-sm">
                  <p className="text-[var(--text-primary)]">{q.question}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {(q.options as string[]).map((opt, i) => (
                      <p key={i} className={i === q.correctAnswer ? "text-green-700" : "text-[var(--text-muted)]"}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {library.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">No questions found.</div>
          )}
        </div>

        {/* Pagination */}
        {libraryPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
              disabled={libraryPage <= 1}
              className="rounded px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-sm text-[var(--text-muted)]">Page {libraryPage} of {libraryPages}</span>
            <button
              onClick={() => setLibraryPage((p) => Math.min(libraryPages, p + 1))}
              disabled={libraryPage >= libraryPages}
              className="rounded px-3 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          AI Generator (collapsible)
          ═══════════════════════════════════════════════════════ */}
      <details className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6">
        <summary className="text-xl font-bold text-[var(--text-primary)] tracking-wide cursor-pointer" style={{ fontFamily: "var(--font-display)" }}>
          AI TRIVIA GENERATOR
        </summary>

        <div className="space-y-6 pt-4">
          <div className="flex flex-wrap gap-4">
            {/* Topic Mode */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Mode</label>
              <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => setTopicMode("topic_football")}
                  className={`px-3 py-2 text-xs font-semibold transition ${topicMode === "topic_football" ? "bg-[#FFB612] text-[var(--text-primary)]" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  Topic + Football
                </button>
                <button
                  onClick={() => setTopicMode("topic_only")}
                  className={`px-3 py-2 text-xs font-semibold transition ${topicMode === "topic_only" ? "bg-[#FFB612] text-[var(--text-primary)]" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  Topic Only
                </button>
              </div>
            </div>

            {/* Sport Context (only when Topic + Football) */}
            {topicMode === "topic_football" && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Sport Context</label>
                <select
                  value={sportContext}
                  onChange={(e) => setSportContext(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
                >
                  {SPORT_CONTEXTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[var(--bg-card)]">{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
              <select
                value={aiCategory}
                onChange={(e) => setAiCategory(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
              >
                {AI_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[var(--bg-card)]">{c.label}</option>
                ))}
              </select>
            </div>

            {aiCategory === "custom" && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-[var(--text-muted)] mb-1">Custom Topic</label>
                <input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Quarterback busts of the 2000s"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none"
                />
              </div>
            )}

            {/* Difficulty */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Difficulty</label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
              >
                {[...DIFFICULTIES, { value: "mixed", label: "Mixed" }].map((d) => (
                  <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">{d.label}</option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Count</label>
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
              >
                {AI_COUNTS.map((n) => (
                  <option key={n} value={n} className="bg-[var(--bg-card)]">{n}</option>
                ))}
              </select>
            </div>

            {/* Generate button + session cost */}
            <div className="flex items-end gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || (aiCategory === "custom" && !customTopic)}
                className="rounded-lg bg-[#FFB612] px-6 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[#FFB612]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              {sessionCost > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] pb-1">Session: {formatCost(sessionCost)}</span>
              )}
            </div>
          </div>

          {/* Generated Questions */}
          {generated.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{generated.length} Questions Generated</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveGenerated(Array.from(selectedGen))}
                    disabled={saving || selectedGen.size === 0}
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : `Save Selected (${selectedGen.size})`}
                  </button>
                  <button
                    onClick={() => handleSaveGenerated(generated.map((_, i) => i))}
                    disabled={saving}
                    className="rounded-lg bg-[#FFB612] px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[#FFB612]/80 transition disabled:opacity-50"
                  >
                    Save All
                  </button>
                </div>
              </div>

              {/* Cost info */}
              {lastUsage && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  Estimated cost: {formatCost(lastUsage.inputTokens * COST_PER_INPUT_TOKEN + lastUsage.outputTokens * COST_PER_OUTPUT_TOKEN)} ({lastUsage.inputTokens.toLocaleString()} input + {lastUsage.outputTokens.toLocaleString()} output tokens)
                </p>
              )}

              {/* Accuracy warning */}
              <p className="text-xs text-yellow-700/70 flex items-center gap-1.5">
                <span>&#x26A0;</span> AI-generated questions may contain errors. Please verify facts before adding to the queue.
              </p>

              <div className="grid gap-4">
                {generated.map((q, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedGen.has(i)}
                        onChange={(e) => {
                          const next = new Set(selectedGen);
                          e.target.checked ? next.add(i) : next.delete(i);
                          setSelectedGen(next);
                        }}
                        className="mt-1 h-4 w-4 accent-[#FFB612]"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                          {(q.options as string[]).map((opt, j) => (
                            <p key={j} className={j === q.correctAnswer ? "text-green-700" : "text-[var(--text-muted)]"}>
                              {String.fromCharCode(65 + j)}. {opt}
                            </p>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="rounded-full bg-[#FFB612]/20 px-2 py-0.5 text-xs text-[#FFB612]">{q.category}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${diffColor[q.difficulty] || "bg-[var(--bg-card)] text-[var(--text-muted)]"}`}>{q.difficulty}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setGenerated((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-700/60 hover:text-red-700 text-sm"
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

      {/* ═══════════════════════════════════════════════════════
          Create / Edit Question Modal
          ═══════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-2xl font-bold text-[var(--text-primary)] tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {editingQuestion ? "EDIT QUESTION" : "NEW QUESTION"}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-[var(--text-muted)] hover:bg-gray-100 hover:text-[var(--text-primary)] transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {editingQuestion && editingQuestion.createdBy === null && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                You&apos;re editing a <span className="font-semibold">system-seeded</span> question. Your changes will overwrite the original content.
              </div>
            )}

            <textarea
              value={questionForm.question}
              onChange={(e) => setQuestionForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Question text..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["A", "B", "C", "D"].map((letter, i) => (
                <div key={letter} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-question-modal"
                    checked={questionForm.correctAnswer === i}
                    onChange={() => setQuestionForm((f) => ({ ...f, correctAnswer: i }))}
                    className="accent-green-500"
                  />
                  <span className="text-xs text-[var(--text-muted)] w-4">{letter}.</span>
                  <input
                    value={questionForm.options[i]}
                    onChange={(e) => {
                      const opts = [...questionForm.options];
                      opts[i] = e.target.value;
                      setQuestionForm((f) => ({ ...f, options: opts }));
                    }}
                    placeholder={`Option ${letter}`}
                    className="flex-1 rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-[var(--text-muted)] mb-1">Category (freetext)</label>
                <input
                  value={questionForm.category}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, category: e.target.value }))}
                  list="category-list-modal"
                  placeholder="e.g. nfl_history, pop_culture, inside_jokes..."
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none"
                />
                <datalist id="category-list-modal">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Difficulty</label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) =>
                    setQuestionForm((f) => ({ ...f, difficulty: e.target.value as "easy" | "medium" | "hard" }))
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">{d.label}</option>
                  ))}
                </select>
              </div>
              {editingQuestion && (
                <div className="flex flex-col justify-end">
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Status</label>
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={questionForm.active}
                      onChange={(e) => setQuestionForm((f) => ({ ...f, active: e.target.checked }))}
                      className="accent-green-600"
                    />
                    <span>{questionForm.active ? "Active" : "Inactive"}</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuestion}
                disabled={savingQuestion}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-green-700 transition disabled:opacity-50"
              >
                {savingQuestion
                  ? (editingQuestion ? "Saving..." : "Creating...")
                  : (editingQuestion ? "Save Changes" : "Create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
