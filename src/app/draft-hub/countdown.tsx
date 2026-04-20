"use client";

import { useEffect, useState } from "react";

const KICKOFF_MS = new Date("2026-04-23T23:00:00.000Z").getTime();

type Remaining = { days: number; hours: number; minutes: number; seconds: number; past: boolean };

function diff(now: number): Remaining {
  const delta = KICKOFF_MS - now;
  if (delta <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  const seconds = Math.floor((delta % 60_000) / 1000);
  return { days, hours, minutes, seconds, past: false };
}

export function DraftCountdown() {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setRemaining(diff(Date.now()));
    const id = setInterval(() => setRemaining(diff(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  const boxes: { label: string; value: number | string }[] = remaining
    ? remaining.past
      ? [{ label: "Status", value: "Live" }]
      : [
          { label: "Days", value: remaining.days },
          { label: "Hours", value: remaining.hours },
          { label: "Minutes", value: remaining.minutes },
          { label: "Seconds", value: remaining.seconds },
        ]
    : [
        { label: "Days", value: "—" },
        { label: "Hours", value: "—" },
        { label: "Minutes", value: "—" },
        { label: "Seconds", value: "—" },
      ];

  return (
    <section className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-nav)] via-[#1a2530] to-[var(--bg-nav)] px-4 py-5 sm:px-6 sm:py-6 text-white shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 14px, rgba(255,255,255,0.25) 14px, rgba(255,255,255,0.25) 28px)",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            Draft Countdown
          </p>
          <h2
            className="mt-1 text-2xl sm:text-3xl font-bold leading-none tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            2026 NFL Draft
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-white/80">
            Round 1 &middot; Thursday, April 23 &middot; Pittsburgh &middot; ESPN, ABC
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3" aria-live="polite">
          {boxes.map((b) => (
            <div
              key={b.label}
              className="flex min-w-[60px] sm:min-w-[72px] flex-col items-center rounded-lg border border-white/10 bg-white/5 px-2 py-2 backdrop-blur-sm"
            >
              <span
                className="font-mono text-xl sm:text-2xl font-bold leading-none text-[var(--accent-primary)] tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {b.value}
              </span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-white/60">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
