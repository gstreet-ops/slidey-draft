export function ScoringBadge({ mode }: { mode: "standard" | "custom" }) {
  if (mode === "custom") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
        Custom Rules
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
      Standard Scoring
    </span>
  );
}
