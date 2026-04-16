"use client";

import type { LetterGrade } from "@/lib/mock-grading";

function gradeCircleColor(grade: LetterGrade): string {
  switch (grade) {
    case "A+":
    case "A":
      return "border-green-500/30 bg-green-500/20 text-green-400";
    case "B+":
    case "B":
      return "border-blue-400/30 bg-blue-400/20 text-blue-400";
    case "C+":
    case "C":
      return "border-yellow-400/30 bg-yellow-400/20 text-yellow-400";
    case "D":
      return "border-orange-400/30 bg-orange-400/20 text-orange-400";
    case "F":
      return "border-red-500/30 bg-red-500/20 text-red-400";
  }
}

function gradeLabelColor(grade: LetterGrade): string {
  switch (grade) {
    case "A+": case "A": return "text-green-400/70";
    case "B+": case "B": return "text-blue-400/70";
    case "C+": case "C": return "text-yellow-400/70";
    case "D": return "text-orange-400/70";
    case "F": return "text-red-400/70";
  }
}

export function GradeCircle({
  grade,
  label,
  size = "md",
}: {
  grade: LetterGrade;
  label?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-full border font-bold ${dim} ${gradeCircleColor(grade)}`}
      >
        {grade}
      </div>
      {label && (
        <span className={`text-[10px] font-medium ${gradeLabelColor(grade)}`}>{label}</span>
      )}
    </div>
  );
}
