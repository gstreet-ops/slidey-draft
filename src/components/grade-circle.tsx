"use client";

import type { LetterGrade } from "@/lib/mock-grading";

function gradeCircleColor(grade: LetterGrade): string {
  switch (grade) {
    case "A+":
    case "A":
      return "border-green-200 bg-green-100 text-green-700";
    case "B+":
    case "B":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "C+":
    case "C":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    case "D":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "F":
      return "border-red-200 bg-red-100 text-red-700";
  }
}

function gradeLabelColor(grade: LetterGrade): string {
  switch (grade) {
    case "A+": case "A": return "text-green-700/70";
    case "B+": case "B": return "text-blue-700/70";
    case "C+": case "C": return "text-yellow-700/70";
    case "D": return "text-orange-700/70";
    case "F": return "text-red-700/70";
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
