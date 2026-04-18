"use client";

import type { LetterGrade } from "@/lib/mock-grading";

function gradeColorClasses(grade: LetterGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return "bg-green-100 text-green-700 border-green-200";
    case 'B+':
    case 'B':
      return "bg-blue-100 text-blue-700 border-blue-200";
    case 'C+':
    case 'C':
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case 'D':
      return "bg-orange-100 text-orange-700 border-orange-200";
    case 'F':
      return "bg-red-100 text-red-700 border-red-200";
  }
}

export function PickGradeBadge({
  grade,
  label,
  size = "sm",
}: {
  grade: LetterGrade;
  label?: string;
  size?: "sm" | "md";
}) {
  const colors = gradeColorClasses(grade);

  if (size === "sm") {
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold ${colors}`}
        title={label}
      >
        {grade}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${colors}`}
      >
        {grade}
      </span>
      {label && (
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
      )}
    </div>
  );
}
