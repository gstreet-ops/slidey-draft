"use client";

import type { LetterGrade } from "@/lib/mock-grading";

function gradeColorClasses(grade: LetterGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case 'B+':
    case 'B':
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case 'C+':
    case 'C':
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case 'D':
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case 'F':
      return "bg-red-500/20 text-red-400 border-red-500/30";
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
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
          {label}
        </span>
      )}
    </div>
  );
}
