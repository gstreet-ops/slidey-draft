"use client";

import { createContext, useContext, useState } from "react";

type MobileTab = "picks" | "prospects";

const Ctx = createContext<{
  tab: MobileTab;
  setTab: (t: MobileTab) => void;
} | null>(null);

/** Read the current mobile tab from the surrounding shell. Returns null when no shell is mounted (desktop / non-mobile pages). */
export function useMobilePicksTab(): { tab: MobileTab; setTab: (t: MobileTab) => void } | null {
  return useContext(Ctx);
}

type Props = {
  filledCount: number;
  totalSlots: number;
  prospectsCount: number;
  /** Wrap the grade card here — it's hidden on mobile when the prospects tab is active. */
  gradeCard?: React.ReactNode;
  /** The pick-builder. It reads the tab via useMobilePicksTab() and hides its own picks/prospects columns accordingly. */
  builder: React.ReactNode;
};

/**
 * Mobile-only tabbed wrapper for the my-board picks view. Above md: it renders
 * children straight through (no tab bar, no hiding). Below md: it shows a tab
 * bar at the top and hides either the grade card + picks column (when "prospects"
 * is active) or the prospects column (when "picks" is active).
 */
export function MobilePicksShell({ filledCount, totalSlots, prospectsCount, gradeCard, builder }: Props) {
  const [tab, setTab] = useState<MobileTab>("picks");

  return (
    <Ctx.Provider value={{ tab, setTab }}>
      {/* Mobile tab bar — wrapped so space-y on the parent can't apply weird margins to the sticky element */}
      <div className="md:hidden">
        <div
          className="sticky top-0 z-30 flex w-full overflow-visible border-b border-gray-200 bg-white shadow-sm"
          role="tablist"
          aria-label="Mock draft view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "picks"}
            onClick={() => setTab("picks")}
            className={`block w-1/2 min-h-[48px] px-2 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap text-center transition border-b-2 ${
              tab === "picks"
                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                : "border-transparent text-[var(--text-muted)]"
            }`}
          >
            My Picks ({filledCount}/{totalSlots})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "prospects"}
            onClick={() => setTab("prospects")}
            className={`block w-1/2 min-h-[48px] px-2 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap text-center transition border-b-2 ${
              tab === "prospects"
                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                : "border-transparent text-[var(--text-muted)]"
            }`}
          >
            Prospects ({prospectsCount})
          </button>
        </div>
      </div>

      {/* Grade card — hidden on mobile when prospects tab is active, always shown on desktop */}
      {gradeCard && (
        <div className={tab === "prospects" ? "hidden md:block" : ""}>{gradeCard}</div>
      )}

      {/* Pick builder — reads the same context to flip picks/prospects column visibility */}
      {builder}
    </Ctx.Provider>
  );
}
