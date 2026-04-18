"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "slidey-sound-enabled";

export function SoundPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setEnabled(stored === "true");
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Draft Night Sounds</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Pick alerts, score chimes, and reactions</p>
      </div>
      <button
        onClick={toggle}
        className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? "bg-[var(--slidey)]" : "bg-[var(--bg-card)]"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
