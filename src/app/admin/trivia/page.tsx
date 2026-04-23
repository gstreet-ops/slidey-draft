"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, Pencil, X, Trash2, GitMerge, Plus } from "lucide-react";
import { TriviaQueue } from "@/components/trivia-queue";
import { TriviaExportModal } from "@/components/trivia-export-modal";
import {
  CategoryBadge,
  colorForCategory,
  textColorFor,
} from "@/components/category-badge";

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

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  questionCount: number;
}

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const SPORT_CONTEXTS = [
  { value: "nfl_draft", label: "NFL Draft" },
  { value: "nfl_general", label: "NFL General" },
  { value: "sports_general", label: "Sports General" },
];

const AI_COUNTS = [3, 5, 10, 15, 20];

const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const CUSTOM_TOPIC_KEY = "__custom__";

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
  // Question modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(EMPTY_FORM);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [inlineNewCat, setInlineNewCat] = useState(false);
  const [inlineNewCatName, setInlineNewCatName] = useState("");
  const [inlineNewCatColor, setInlineNewCatColor] = useState("#3B82F6");

  const [showExport, setShowExport] = useState(false);

  // AI Generator
  const [topicMode, setTopicMode] = useState<"topic_football" | "topic_only">("topic_football");
  const [sportContext, setSportContext] = useState("nfl_draft");
  const [aiCategory, setAiCategory] = useState<string>("");
  const [customTopic, setCustomTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiCount, setAiCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [selectedGen, setSelectedGen] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [lastUsage, setLastUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [sessionCost, setSessionCost] = useState(0);

  // Library
  const [library, setLibrary] = useState<Question[]>([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryPages, setLibraryPages] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Categories (master list)
  const [categories, setCategories] = useState<Category[]>([]);
  const [catManagerOpen, setCatManagerOpen] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#3B82F6");
  const [savingNewCat, setSavingNewCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatColor, setEditingCatColor] = useState("#3B82F6");
  const [savingEditCat, setSavingEditCat] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergeConfirm, setMergeConfirm] = useState<null | { source: Category; target: Category }>(null);
  const [mergeBusy, setMergeBusy] = useState(false);

  const [toast, setToast] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/trivia/categories");
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchLibrary = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(libraryPage),
      limit: "50",
      includeInactive: "true",
    });
    if (filterCategory) params.set("category", filterCategory);
    if (filterDifficulty) params.set("difficulty", filterDifficulty);
    if (searchText) params.set("search", searchText);
    const res = await fetch(`/api/trivia/questions?${params}`);
    const data = await res.json();
    setLibrary(data.questions);
    setLibraryTotal(data.total);
    setLibraryPages(data.pages);
  }, [libraryPage, filterCategory, filterDifficulty, searchText]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Default AI category once the list loads
  useEffect(() => {
    if (!aiCategory && categories.length > 0) {
      const preferred =
        categories.find((c) => c.name === "Draft Trivia") ||
        categories.find((c) => c.name === "Draft History") ||
        categories[0];
      setAiCategory(preferred.name);
    }
  }, [categories, aiCategory]);

  function showToast(msg: string, persist = false) {
    setToast(msg);
    if (!persist) setTimeout(() => setToast(""), 3000);
  }

  // ── Create / Edit Question ──
  function openCreateModal() {
    setEditingQuestion(null);
    setInlineNewCat(false);
    const defaultCat = categories[0]?.name || "";
    setQuestionForm({ ...EMPTY_FORM, category: defaultCat });
    setModalOpen(true);
  }

  function openEditModal(q: Question) {
    setEditingQuestion(q);
    setInlineNewCat(false);
    const opts =
      Array.isArray(q.options) && q.options.length === 4
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
    setInlineNewCat(false);
    setInlineNewCatName("");
  }

  async function handleInlineCreateCategory() {
    const name = inlineNewCatName.trim();
    if (!name) {
      showToast("Enter a category name");
      return;
    }
    try {
      const res = await fetch("/api/trivia/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: inlineNewCatColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create category");
        return;
      }
      await fetchCategories();
      setQuestionForm((f) => ({ ...f, category: data.category.name }));
      setInlineNewCat(false);
      setInlineNewCatName("");
      showToast(`Created "${data.category.name}"`);
    } catch {
      showToast("Failed to create category");
    }
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
        fetchCategories();
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
          category: aiCategory === CUSTOM_TOPIC_KEY ? "custom" : aiCategory,
          difficulty: aiDifficulty,
          count: aiCount,
          customTopic: aiCategory === CUSTOM_TOPIC_KEY ? customTopic : undefined,
          topicMode,
          sportContext: topicMode === "topic_football" ? sportContext : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(`Error: ${data.error}`, true);
      } else {
        // Tag all generated questions with the master category name so they land in the right bucket when saved.
        const categoryName =
          aiCategory === CUSTOM_TOPIC_KEY ? (customTopic || "General Knowledge") : aiCategory;
        const tagged = (data.questions as Question[]).map((q) => ({
          ...q,
          category: categoryName,
        }));
        setGenerated(tagged);
        setSelectedGen(new Set(tagged.map((_, i) => i)));
        if (data.usage) {
          setLastUsage(data.usage);
          const cost =
            data.usage.inputTokens * COST_PER_INPUT_TOKEN +
            data.usage.outputTokens * COST_PER_OUTPUT_TOKEN;
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
      fetchCategories();
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
    fetchCategories();
  }

  // ── Selection / bulk ──
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPageSelected = useMemo(() => {
    if (library.length === 0) return false;
    return library.every((q) => selectedIds.has(q.id));
  }, [library, selectedIds]);

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const q of library) next.delete(q.id);
      } else {
        for (const q of library) next.add(q.id);
      }
      return next;
    });
  }

  async function applyBulkCategory() {
    if (selectedIds.size === 0 || !bulkCategory) return;
    setApplyingBulk(true);
    try {
      const res = await fetch("/api/trivia/questions/bulk-categorize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: Array.from(selectedIds),
          category: bulkCategory,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Updated ${data.updated} questions to ${data.category}`);
        setSelectedIds(new Set());
        setBulkCategory("");
        fetchLibrary();
        fetchCategories();
      } else {
        showToast(data.error || "Failed to update");
      }
    } catch {
      showToast("Failed to update questions");
    } finally {
      setApplyingBulk(false);
    }
  }

  // ── Category Manager actions ──
  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) {
      showToast("Enter a category name");
      return;
    }
    setSavingNewCat(true);
    try {
      const res = await fetch("/api/trivia/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newCatColor }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Added "${data.category.name}"`);
        setNewCatName("");
        setNewCatColor("#3B82F6");
        fetchCategories();
      } else {
        showToast(data.error || "Failed to add");
      }
    } catch {
      showToast("Failed to add category");
    } finally {
      setSavingNewCat(false);
    }
  }

  function startEditCategory(cat: Category) {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatColor(cat.color);
    setMergeSourceId(null);
  }

  function cancelEditCategory() {
    setEditingCatId(null);
    setEditingCatName("");
    setEditingCatColor("#3B82F6");
  }

  async function handleSaveEditCategory() {
    if (!editingCatId) return;
    setSavingEditCat(true);
    try {
      const res = await fetch(`/api/trivia/categories/${editingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCatName.trim(), color: editingCatColor }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Category updated");
        cancelEditCategory();
        fetchCategories();
        fetchLibrary();
      } else {
        showToast(data.error || "Failed to save");
      }
    } catch {
      showToast("Failed to save category");
    } finally {
      setSavingEditCat(false);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    if (cat.questionCount > 0) return;
    if (!confirm(`Delete the "${cat.name}" category?`)) return;
    try {
      const res = await fetch(`/api/trivia/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Deleted "${cat.name}"`);
        fetchCategories();
      } else {
        showToast(data.error || "Failed to delete");
      }
    } catch {
      showToast("Failed to delete category");
    }
  }

  function openMergeFor(cat: Category) {
    setMergeSourceId(cat.id);
    setMergeTargetId("");
  }

  function confirmMerge() {
    const source = categories.find((c) => c.id === mergeSourceId);
    const target = categories.find((c) => c.id === mergeTargetId);
    if (!source || !target) return;
    setMergeConfirm({ source, target });
  }

  async function handleMerge() {
    if (!mergeConfirm) return;
    setMergeBusy(true);
    try {
      const res = await fetch("/api/trivia/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: mergeConfirm.source.id,
          targetId: mergeConfirm.target.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Merged ${data.moved} questions into ${data.target}`);
        setMergeConfirm(null);
        setMergeSourceId(null);
        setMergeTargetId("");
        fetchCategories();
        fetchLibrary();
      } else {
        showToast(data.error || "Failed to merge");
      }
    } catch {
      showToast("Failed to merge categories");
    } finally {
      setMergeBusy(false);
    }
  }

  function formatCost(dollars: number) {
    if (dollars < 0.01) return `~$${(dollars * 100).toFixed(2)}c`;
    return `~$${dollars.toFixed(3)}`;
  }

  function creatorLabel(q: Question): string {
    if (!q.createdBy) return "System";
    return q.createdByName || q.createdByEmail || "Commissioner";
  }

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  return (
    <div className="space-y-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-lg animate-in fade-in max-w-md ${
            toast.startsWith("Error") || toast.startsWith("Failed") ? "bg-red-600" : "bg-[#FFB612]"
          }`}
        >
          {toast}
          <button
            onClick={() => setToast("")}
            className="ml-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            &times;
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Pool Queue Builder
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6">
        <h2
          className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          POOL QUEUE BUILDER
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Select a pool, then arrange questions in the order they&apos;ll fire during the draft.
        </p>
        <TriviaQueue categories={categories} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          Question Bank
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
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
            onChange={(e) => {
              setSearchText(e.target.value);
              setLibraryPage(1);
            }}
            placeholder="Search questions..."
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none flex-1 min-w-[200px]"
          />
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setLibraryPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
          >
            <option value="" className="bg-[var(--bg-card)]">
              All Categories
            </option>
            {sortedCategories.map((c) => (
              <option key={c.id} value={c.name} className="bg-[var(--bg-card)]">
                ● {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => {
              setFilterDifficulty(e.target.value);
              setLibraryPage(1);
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
          >
            <option value="" className="bg-[var(--bg-card)]">
              All Difficulties
            </option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">
                {d.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-[var(--text-muted)] self-center">{libraryTotal} questions</div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#FFB612]/60 bg-[#FFB612]/10 px-4 py-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-muted)]">Change category to:</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
              >
                <option value="">Select category…</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    ● {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={applyBulkCategory}
                disabled={applyingBulk || !bulkCategory}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-green-700 transition disabled:opacity-50"
              >
                {applyingBulk ? "Applying…" : "Apply"}
              </button>
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Select-all row */}
        {library.length > 0 && (
          <div className="flex items-center gap-2 px-2 text-xs text-[var(--text-muted)]">
            <input
              id="trivia-select-all"
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAllOnPage}
              className="h-4 w-4 accent-[#FFB612]"
            />
            <label htmlFor="trivia-select-all" className="cursor-pointer select-none">
              Select all on this page
            </label>
          </div>
        )}

        {/* Question Table */}
        <div className="space-y-2">
          {library.map((q) => {
            const isSelected = selectedIds.has(q.id);
            return (
              <div
                key={q.id}
                className={`rounded-lg border ${
                  q.active
                    ? isSelected
                      ? "border-[#FFB612] bg-[var(--bg-card)]"
                      : "border-[var(--border)] bg-[var(--bg-card)]"
                    : "border-[var(--border-light)] bg-[var(--bg-card)] opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(q.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 h-4 w-4 accent-[#FFB612]"
                    aria-label="Select question"
                  />
                  <div
                    className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    <p className="flex-1 text-sm text-[var(--text-primary)] truncate">{q.question}</p>
                    <CategoryBadge name={q.category} categories={categories} />
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${
                        diffColor[q.difficulty] || "bg-[var(--bg-card)] text-[var(--text-muted)]"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    {q.createdBy === null ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        System
                      </span>
                    ) : (
                      <span
                        className="shrink-0 text-[10px] text-[var(--text-muted)] max-w-[120px] truncate"
                        title={creatorLabel(q)}
                      >
                        {creatorLabel(q)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(q);
                    }}
                    className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:bg-gray-100 hover:text-[var(--text-primary)] transition"
                    title="Edit question"
                    aria-label="Edit question"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(q);
                    }}
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                      q.active
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {q.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(q.id);
                    }}
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
                        <p
                          key={i}
                          className={
                            i === q.correctAnswer ? "text-green-700" : "text-[var(--text-muted)]"
                          }
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
            <span className="text-sm text-[var(--text-muted)]">
              Page {libraryPage} of {libraryPages}
            </span>
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
          Category Manager
          ═══════════════════════════════════════════════════════ */}
      <details
        open={catManagerOpen}
        onToggle={(e) => setCatManagerOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6"
      >
        <summary
          className="text-2xl font-bold text-[var(--text-primary)] tracking-wide cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
        >
          CATEGORY MANAGER
        </summary>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-[var(--text-muted)]">
            One master list of categories — every dropdown on this page reads from here. Edit a color
            to re-paint every badge instantly. Merge duplicates to move all their questions in one move.
          </p>

          {/* Category list */}
          <div className="space-y-2">
            {sortedCategories.map((cat) => {
              const isEditing = editingCatId === cat.id;
              const isMerging = mergeSourceId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {isEditing ? (
                      <>
                        <input
                          type="color"
                          value={editingCatColor}
                          onChange={(e) => setEditingCatColor(e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-white p-0.5"
                          aria-label="Category color"
                        />
                        <input
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 min-w-[180px] rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
                        />
                        <button
                          onClick={handleSaveEditCategory}
                          disabled={savingEditCat || !editingCatName.trim()}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {savingEditCat ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEditCategory}
                          className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className="inline-block h-5 w-5 shrink-0 rounded-full border border-black/5"
                          style={{ backgroundColor: cat.color }}
                          aria-hidden
                        />
                        <CategoryBadge name={cat.name} color={cat.color} />
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {cat.color.toUpperCase()}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">
                          {cat.questionCount} question{cat.questionCount === 1 ? "" : "s"}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => openMergeFor(cat)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition"
                          >
                            <GitMerge size={12} /> Merge
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={cat.questionCount > 0}
                            title={
                              cat.questionCount > 0
                                ? "Merge or reassign questions first"
                                : "Delete category"
                            }
                            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold text-red-700/70 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {isMerging && !isEditing && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-white/60 px-3 py-2">
                      <span className="text-xs text-[var(--text-muted)]">Merge into:</span>
                      <select
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
                      >
                        <option value="">Choose target category…</option>
                        {sortedCategories
                          .filter((c) => c.id !== cat.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              ● {c.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={confirmMerge}
                        disabled={!mergeTargetId}
                        className="rounded-lg bg-[#FFB612] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[#FFB612]/80 transition disabled:opacity-50"
                      >
                        Merge
                      </button>
                      <button
                        onClick={() => {
                          setMergeSourceId(null);
                          setMergeTargetId("");
                        }}
                        className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {sortedCategories.length === 0 && (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                No categories yet. Add one below.
              </div>
            )}
          </div>

          {/* Add category */}
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-white p-0.5"
                aria-label="New category color"
              />
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCatName.trim()) handleAddCategory();
                }}
                placeholder="New category name (e.g. Playoffs)"
                className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none"
              />
              <button
                onClick={handleAddCategory}
                disabled={savingNewCat || !newCatName.trim()}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-green-700 transition disabled:opacity-50"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* ═══════════════════════════════════════════════════════
          AI Generator (collapsible)
          ═══════════════════════════════════════════════════════ */}
      <details className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-6">
        <summary
          className="text-xl font-bold text-[var(--text-primary)] tracking-wide cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
        >
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
                  className={`px-3 py-2 text-xs font-semibold transition ${
                    topicMode === "topic_football"
                      ? "bg-[#FFB612] text-[var(--text-primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Topic + Football
                </button>
                <button
                  onClick={() => setTopicMode("topic_only")}
                  className={`px-3 py-2 text-xs font-semibold transition ${
                    topicMode === "topic_only"
                      ? "bg-[#FFB612] text-[var(--text-primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
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
                    <option key={s.value} value={s.value} className="bg-[var(--bg-card)]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category — pulled from master list */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
              <select
                value={aiCategory}
                onChange={(e) => setAiCategory(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
              >
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.name} className="bg-[var(--bg-card)]">
                    ● {c.name}
                  </option>
                ))}
                <option value={CUSTOM_TOPIC_KEY} className="bg-[var(--bg-card)]">
                  Custom Topic
                </option>
              </select>
            </div>

            {aiCategory === CUSTOM_TOPIC_KEY && (
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
                  <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">
                    {d.label}
                  </option>
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
                  <option key={n} value={n} className="bg-[var(--bg-card)]">
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate button + session cost */}
            <div className="flex items-end gap-3">
              <button
                onClick={handleGenerate}
                disabled={
                  generating ||
                  !aiCategory ||
                  (aiCategory === CUSTOM_TOPIC_KEY && !customTopic)
                }
                className="rounded-lg bg-[#FFB612] px-6 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[#FFB612]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  "Generate"
                )}
              </button>
              {sessionCost > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] pb-1">
                  Session: {formatCost(sessionCost)}
                </span>
              )}
            </div>
          </div>

          {/* Generated Questions */}
          {generated.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {generated.length} Questions Generated
                </h3>
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

              {lastUsage && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  Estimated cost:{" "}
                  {formatCost(
                    lastUsage.inputTokens * COST_PER_INPUT_TOKEN +
                      lastUsage.outputTokens * COST_PER_OUTPUT_TOKEN
                  )}{" "}
                  ({lastUsage.inputTokens.toLocaleString()} input +{" "}
                  {lastUsage.outputTokens.toLocaleString()} output tokens)
                </p>
              )}

              <p className="text-xs text-yellow-700/70 flex items-center gap-1.5">
                <span>&#x26A0;</span> AI-generated questions may contain errors. Please verify facts
                before adding to the queue.
              </p>

              <div className="grid gap-4">
                {generated.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedGen.has(i)}
                        onChange={(e) => {
                          const next = new Set(selectedGen);
                          if (e.target.checked) next.add(i);
                          else next.delete(i);
                          setSelectedGen(next);
                        }}
                        className="mt-1 h-4 w-4 accent-[#FFB612]"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                          {(q.options as string[]).map((opt, j) => (
                            <p
                              key={j}
                              className={
                                j === q.correctAnswer
                                  ? "text-green-700"
                                  : "text-[var(--text-muted)]"
                              }
                            >
                              {String.fromCharCode(65 + j)}. {opt}
                            </p>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <CategoryBadge name={q.category} categories={categories} />
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              diffColor[q.difficulty] ||
                              "bg-[var(--bg-card)] text-[var(--text-muted)]"
                            }`}
                          >
                            {q.difficulty}
                          </span>
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
                You&apos;re editing a <span className="font-semibold">system-seeded</span> question.
                Your changes will overwrite the original content.
              </div>
            )}

            <textarea
              value={questionForm.question}
              onChange={(e) =>
                setQuestionForm((f) => ({ ...f, question: e.target.value }))
              }
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
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
                {inlineNewCat ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={inlineNewCatColor}
                      onChange={(e) => setInlineNewCatColor(e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded border border-[var(--border)] bg-white p-0.5"
                      aria-label="Category color"
                    />
                    <input
                      autoFocus
                      value={inlineNewCatName}
                      onChange={(e) => setInlineNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInlineCreateCategory();
                      }}
                      placeholder="New category name"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none"
                    />
                    <button
                      onClick={handleInlineCreateCategory}
                      disabled={!inlineNewCatName.trim()}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setInlineNewCat(false);
                        setInlineNewCatName("");
                      }}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {questionForm.category && (
                      <span
                        className="inline-block h-5 w-5 shrink-0 rounded-full border border-black/10"
                        style={{
                          backgroundColor: colorForCategory(questionForm.category, categories),
                        }}
                        aria-hidden
                      />
                    )}
                    <select
                      value={questionForm.category}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__new__") {
                          setInlineNewCat(true);
                        } else {
                          setQuestionForm((f) => ({ ...f, category: v }));
                        }
                      }}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
                    >
                      <option value="" disabled>
                        Select a category…
                      </option>
                      {sortedCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          ● {c.name}
                        </option>
                      ))}
                      <option value="__new__">+ New Category…</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Difficulty</label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      difficulty: e.target.value as "easy" | "medium" | "hard",
                    }))
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value} className="bg-[var(--bg-card)]">
                      {d.label}
                    </option>
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
                      onChange={(e) =>
                        setQuestionForm((f) => ({ ...f, active: e.target.checked }))
                      }
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
                  ? editingQuestion
                    ? "Saving..."
                    : "Creating..."
                  : editingQuestion
                    ? "Save Changes"
                    : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Merge confirm modal
          ═══════════════════════════════════════════════════════ */}
      {mergeConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !mergeBusy && setMergeConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-xl font-bold text-[var(--text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              CONFIRM MERGE
            </h3>
            <p className="text-sm text-[var(--text-primary)] flex flex-wrap items-center gap-1.5">
              Merge{" "}
              <strong>
                {mergeConfirm.source.questionCount} question
                {mergeConfirm.source.questionCount === 1 ? "" : "s"}
              </strong>{" "}
              from{" "}
              <CategoryBadge name={mergeConfirm.source.name} color={mergeConfirm.source.color} />{" "}
              into{" "}
              <CategoryBadge name={mergeConfirm.target.name} color={mergeConfirm.target.color} />?
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              The &quot;{mergeConfirm.source.name}&quot; category will be deleted after the merge.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMergeConfirm(null)}
                disabled={mergeBusy}
                className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={mergeBusy}
                className="rounded-lg px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
                style={{
                  backgroundColor: mergeConfirm.target.color,
                  color: textColorFor(mergeConfirm.target.color),
                }}
              >
                {mergeBusy ? "Merging…" : "Merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
