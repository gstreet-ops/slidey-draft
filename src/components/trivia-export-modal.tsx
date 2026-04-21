"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

type Format = "csv" | "json" | "pdf";
type Difficulty = "easy" | "medium" | "hard";

const ALL_DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const FORMATS: { value: Format; label: string; blurb: string }[] = [
  { value: "csv", label: "CSV", blurb: "Spreadsheet-friendly" },
  { value: "json", label: "JSON", blurb: "Machine-readable" },
  { value: "pdf", label: "PDF", blurb: "Formatted document" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  return u.toString();
}

export function TriviaExportModal({
  open,
  onClose,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<Difficulty>>(
    new Set(["easy", "medium", "hard"])
  );
  const [includeInactive, setIncludeInactive] = useState(false);
  const [format, setFormat] = useState<Format>("csv");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  // Tracks whether the user has explicitly changed the slider. Until they do,
  // limit mirrors matchCount (i.e. "all matching").
  const userTouchedLimit = useRef(false);
  const [loadingCount, setLoadingCount] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);

  // First open: bootstrap categories list, select all.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/trivia/questions/export?countOnly=true`);
      if (!res.ok) {
        onToast(res.status === 403 ? "Admins only" : "Failed to load categories");
        return;
      }
      const data = (await res.json()) as { count: number; categories: string[] };
      if (cancelled) return;
      setCategories(data.categories);
      setSelectedCategories(new Set(data.categories));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, onToast]);

  // Recompute match count whenever filters change.
  const filterKey = useMemo(() => {
    const cats = [...selectedCategories].sort().join(",");
    const diffs = [...selectedDifficulties].sort().join(",");
    return `${cats}|${diffs}|${includeInactive}`;
  }, [selectedCategories, selectedDifficulties, includeInactive]);

  useEffect(() => {
    if (!open) return;
    if (categories.length === 0) return;

    let cancelled = false;
    setLoadingCount(true);

    const qs = buildQuery({
      countOnly: "true",
      categories: [...selectedCategories].join(","),
      difficulties: [...selectedDifficulties].join(","),
      includeInactive: includeInactive ? "true" : undefined,
    });

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trivia/questions/export?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (cancelled) return;
        setMatchCount(data.count);
        // Clamp any user-specified limit to new match count.
        setLimit((prev) => {
          if (!userTouchedLimit.current) return data.count;
          if (prev == null) return data.count;
          return Math.min(prev, Math.max(data.count, 1));
        });
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, filterKey, categories.length, selectedCategories, selectedDifficulties, includeInactive]);

  // Reset when modal closes so reopening is a clean state.
  useEffect(() => {
    if (open) return;
    setCatDropdownOpen(false);
    userTouchedLimit.current = false;
  }, [open]);

  // ESC to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  const toggleDifficulty = (d: Difficulty) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const effectiveLimit = limit == null ? matchCount ?? 0 : limit;
  const willDownload = Math.max(
    0,
    Math.min(effectiveLimit, matchCount ?? 0)
  );

  const handleDownload = useCallback(async () => {
    if (willDownload === 0) return;
    setDownloading(true);
    try {
      const qs = buildQuery({
        format,
        categories: [...selectedCategories].join(","),
        difficulties: [...selectedDifficulties].join(","),
        includeInactive: includeInactive ? "true" : undefined,
        limit:
          userTouchedLimit.current && matchCount != null && effectiveLimit < matchCount
            ? effectiveLimit
            : undefined,
      });
      const res = await fetch(`/api/trivia/questions/export?${qs}`);
      if (!res.ok) {
        onToast(res.status === 403 ? "Admins only" : "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `trivia-export-${todayIsoDate()}.${format}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast(
        `Downloaded ${willDownload} question${willDownload === 1 ? "" : "s"} as ${format.toUpperCase()}`
      );
      onClose();
    } catch {
      onToast("Download failed");
    } finally {
      setDownloading(false);
    }
  }, [
    willDownload,
    format,
    selectedCategories,
    selectedDifficulties,
    includeInactive,
    matchCount,
    effectiveLimit,
    onToast,
    onClose,
  ]);

  if (!open) return null;

  const catLabel =
    selectedCategories.size === 0
      ? "None selected"
      : selectedCategories.size === categories.length
      ? "All categories"
      : `${selectedCategories.size} selected`;

  const downloadBtnLabel =
    matchCount == null
      ? "Loading…"
      : willDownload === 0
      ? "No questions match"
      : `Download ${willDownload} Question${willDownload === 1 ? "" : "s"} as ${format.toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trivia-export-title"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
          <div>
            <h2
              id="trivia-export-title"
              className="text-xl font-bold text-[var(--text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EXPORT QUESTIONS
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Filter, then download as CSV, JSON, or PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {categories.length === 0 && matchCount === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No questions to export.
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              The trivia bank is empty.
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            {/* Categories */}
            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Categories
              </label>
              <button
                type="button"
                onClick={() => setCatDropdownOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] hover:border-[#FFB612] transition"
                aria-expanded={catDropdownOpen}
              >
                <span>{catLabel}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${catDropdownOpen ? "rotate-180" : ""}`}
                >
                  <path d="M3.5 5.5l3.5 3.5 3.5-3.5" />
                </svg>
              </button>
              {catDropdownOpen && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-white shadow-lg">
                  <div className="sticky top-0 flex gap-2 border-b border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px]">
                    <button
                      onClick={() => setSelectedCategories(new Set(categories))}
                      className="font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Select all
                    </button>
                    <span className="text-[var(--text-muted)]">·</span>
                    <button
                      onClick={() => setSelectedCategories(new Set())}
                      className="font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Clear
                    </button>
                  </div>
                  {categories.map((c) => (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#FFB612]"
                        checked={selectedCategories.has(c)}
                        onChange={() => toggleCategory(c)}
                      />
                      <span>{c.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Difficulty
              </label>
              <div className="flex gap-2">
                {ALL_DIFFICULTIES.map((d) => {
                  const on = selectedDifficulties.has(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDifficulty(d.value)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                        on
                          ? "border-[#FFB612] bg-[#FFB612]/10 text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                      aria-pressed={on}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Limit slider */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Number of questions
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, matchCount ?? 1)}
                  value={Math.min(effectiveLimit || 1, Math.max(1, matchCount ?? 1))}
                  onChange={(e) => {
                    userTouchedLimit.current = true;
                    setLimit(parseInt(e.target.value, 10));
                  }}
                  disabled={!matchCount}
                  className="flex-1 accent-[#FFB612] disabled:opacity-40"
                />
                <input
                  type="number"
                  min={1}
                  max={matchCount ?? 1}
                  value={effectiveLimit}
                  onChange={(e) => {
                    userTouchedLimit.current = true;
                    const n = parseInt(e.target.value || "0", 10);
                    if (Number.isFinite(n)) setLimit(Math.max(1, n));
                  }}
                  disabled={!matchCount}
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-sm text-[var(--text-primary)] focus:border-[#FFB612] focus:outline-none disabled:opacity-40"
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {userTouchedLimit.current && matchCount != null && effectiveLimit < matchCount
                  ? `Randomly samples ${effectiveLimit} of ${matchCount} matches.`
                  : "Downloads all matching questions."}
              </p>
            </div>

            {/* Include inactive */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                className="accent-[#FFB612]"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              <span>Include inactive questions</span>
            </label>

            {/* Live count */}
            <div className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-2 text-sm">
              {loadingCount || matchCount == null ? (
                <span className="text-[var(--text-muted)]">Counting…</span>
              ) : (
                <span className="text-[var(--text-primary)]">
                  <strong>{willDownload}</strong>{" "}
                  <span className="text-[var(--text-muted)]">
                    of {matchCount} questions match your filters
                  </span>
                </span>
              )}
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    aria-pressed={format === f.value}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      format === f.value
                        ? "border-[#FFB612] bg-[#FFB612]/10"
                        : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[#FFB612]/40"
                    }`}
                  >
                    <p className="text-sm font-bold text-[var(--text-primary)]">{f.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{f.blurb}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={willDownload === 0 || downloading || loadingCount}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFB612] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[#FFB612]/90 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {downloading ? "Preparing download…" : downloadBtnLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
