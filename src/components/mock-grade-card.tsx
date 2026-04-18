"use client";

import { useEffect, useState } from "react";
import type { MockDraftGrade, LetterGrade } from "@/lib/mock-grading";
import { generateMockSummaryCommentary } from "@/lib/pick-commentary";

function gradeCircleColor(grade: LetterGrade): string {
  switch (grade) {
    case 'A+': case 'A': return "border-green-200 bg-green-100 text-green-700";
    case 'B+': case 'B': return "border-blue-200 bg-blue-100 text-blue-700";
    case 'C+': case 'C': return "border-yellow-200 bg-yellow-100 text-yellow-700";
    case 'D': return "border-orange-200 bg-orange-100 text-orange-700";
    case 'F': return "border-red-200 bg-red-100 text-red-700";
  }
}

function gradeSummaryColor(grade: LetterGrade): string {
  switch (grade) {
    case 'A+': case 'A': return "text-green-700/70";
    case 'B+': case 'B': return "text-blue-700/70";
    case 'C+': case 'C': return "text-yellow-700/70";
    case 'D': return "text-orange-700/70";
    case 'F': return "text-red-700/70";
  }
}

export function MockGradeCard({ boardId }: { boardId: string }) {
  const [grade, setGrade] = useState<(MockDraftGrade & { pickPositions?: Array<{ position: string }> }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/grade-mock?boardId=${boardId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setGrade(data))
      .catch(() => setGrade(null))
      .finally(() => setLoading(false));
  }, [boardId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[var(--bg-card)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-[var(--bg-card)]" />
            <div className="h-3 w-32 rounded bg-[var(--bg-card)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!grade) return null;

  return (
    <div className="rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Large grade circle */}
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 ring-2 ring-[var(--accent-primary)]/20 ${gradeCircleColor(grade.letterGrade)}`}
        >
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {grade.letterGrade}
          </span>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Your Mock Draft Grade
          </p>
          <p className={`text-sm mt-0.5 ${gradeSummaryColor(grade.letterGrade)}`}>{grade.summary}</p>
          {grade.pickPositions && (() => {
            const richSummary = generateMockSummaryCommentary(grade, grade.pickPositions);
            return richSummary !== grade.summary ? (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{richSummary}</p>
            ) : null;
          })()}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-center shrink-0">
          <div>
            <p className="text-sm font-bold text-green-700">{grade.steals}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Steals</p>
          </div>
          <div>
            <p className="text-sm font-bold text-blue-700">{grade.solid}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Solid</p>
          </div>
          <div>
            <p className="text-sm font-bold text-yellow-700">{grade.reaches}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Reaches</p>
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">{grade.busts}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Busts</p>
          </div>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="flex sm:hidden items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <div className="text-center">
          <p className="text-sm font-bold text-green-700">{grade.steals}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Steals</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-blue-700">{grade.solid}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Solid</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-yellow-700">{grade.reaches}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Reaches</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-red-700">{grade.busts}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Busts</p>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] mt-2">
        Based on ESPN prospect grades and consensus rankings
      </p>
    </div>
  );
}
