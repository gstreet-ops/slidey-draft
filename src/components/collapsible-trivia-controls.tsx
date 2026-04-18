"use client";

import { useState } from "react";
import { TriviaControlPanel } from "@/components/trivia-control-panel";

export function CollapsibleTriviaControls({
  poolId,
  triviaTimerSeconds,
}: {
  poolId: string;
  triviaTimerSeconds: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[var(--bg-card)] transition rounded-xl"
      >
        <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
          <span>{"\uD83C\uDFAE"}</span> Trivia Controls
        </span>
        <span className="text-xs text-[var(--text-muted)]">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="px-5 pb-5">
          <TriviaControlPanel
            poolId={poolId}
            initialSettings={{ triviaTimerSeconds }}
          />
        </div>
      )}
    </div>
  );
}
