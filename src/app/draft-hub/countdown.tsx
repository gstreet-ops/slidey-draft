"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KICKOFF_MS = new Date("2026-04-24T00:00:00.000Z").getTime(); // Apr 23 2026 8:00 PM ET

function formatRemaining(now: number): string {
  const delta = KICKOFF_MS - now;
  if (delta <= 0) return "LIVE NOW";
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  return `${days}d ${hours}h ${minutes}m`;
}

export function DraftCountdown() {
  const [remaining, setRemaining] = useState<string>("—");

  useEffect(() => {
    setRemaining(formatRemaining(Date.now()));
    const id = setInterval(() => setRemaining(formatRemaining(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="w-full"
      style={{ backgroundColor: "#CC0000" }}
      role="status"
      aria-label="Draft countdown"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2">
        {/* Left: pulsing dot + label + countdown */}
        <div className="flex items-center gap-2 text-white">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Live Countdown
          </span>
          <span
            className="text-sm font-bold tabular-nums sm:text-base"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
            aria-live="polite"
          >
            {remaining}
          </span>
        </div>

        {/* Center: draft info */}
        <p className="truncate text-center text-[11px] font-medium text-white/90 sm:text-xs">
          Round 1 &middot; Thu Apr 23, 8:00 PM ET &middot; Pittsburgh &middot; ESPN, ABC
        </p>

        {/* Right: CTA */}
        <Link
          href="/live"
          className="flex shrink-0 items-center justify-center gap-1 self-end rounded bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-white/25 sm:self-auto"
        >
          Go Live
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
