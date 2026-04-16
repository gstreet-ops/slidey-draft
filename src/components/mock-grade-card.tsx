"use client";

import { useEffect, useState } from "react";
import type { MockDraftGrade, LetterGrade } from "@/lib/mock-grading";
import { generateMockSummaryCommentary } from "@/lib/pick-commentary";

function gradeCircleColor(grade: LetterGrade): string {
  switch (grade) {
    case 'A+': case 'A': return "border-green-500/30 bg-green-500/20 text-green-400";
    case 'B+': case 'B': return "border-blue-500/30 bg-blue-500/20 text-blue-400";
    case 'C+': case 'C': return "border-yellow-500/30 bg-yellow-500/20 text-yellow-400";
    case 'D': return "border-orange-500/30 bg-orange-500/20 text-orange-400";
    case 'F': return "border-red-500/30 bg-red-500/20 text-red-400";
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-white/10" />
            <div className="h-3 w-32 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!grade) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-4">
        {/* Large grade circle */}
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 ${gradeCircleColor(grade.letterGrade)}`}
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
            className="text-[10px] font-bold uppercase tracking-wider text-white/40"
          >
            Your Mock Draft Grade
          </p>
          <p className="text-sm text-white/80 mt-0.5">{grade.summary}</p>
          {grade.pickPositions && (() => {
            const richSummary = generateMockSummaryCommentary(grade, grade.pickPositions);
            return richSummary !== grade.summary ? (
              <p className="text-xs text-white/40 mt-1 line-clamp-2">{richSummary}</p>
            ) : null;
          })()}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-center shrink-0">
          <div>
            <p className="text-sm font-bold text-green-400">{grade.steals}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Steals</p>
          </div>
          <div>
            <p className="text-sm font-bold text-blue-400">{grade.solid}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Solid</p>
          </div>
          <div>
            <p className="text-sm font-bold text-yellow-400">{grade.reaches}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Reaches</p>
          </div>
          <div>
            <p className="text-sm font-bold text-red-400">{grade.busts}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Busts</p>
          </div>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="flex sm:hidden items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div className="text-center">
          <p className="text-sm font-bold text-green-400">{grade.steals}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Steals</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-blue-400">{grade.solid}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Solid</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-yellow-400">{grade.reaches}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Reaches</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-red-400">{grade.busts}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Busts</p>
        </div>
      </div>

      <p className="text-[10px] text-white/30 mt-2">
        Based on ESPN prospect grades and consensus rankings
      </p>
    </div>
  );
}
