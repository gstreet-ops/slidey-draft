"use client";

import { useState, useEffect } from "react";

type Props = {
  lastUpdated: Date | null;
  failCount: number;
  onRefresh: () => void;
};

export function ConnectionStatus({ lastUpdated, failCount, onRefresh }: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  if (failCount >= 3) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center justify-between"
           style={{ animation: "fade-in 0.3s ease-out" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-700 text-sm font-medium">Connection lost — retrying...</span>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-amber-700 hover:text-amber-700 font-semibold transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!lastUpdated) return null;

  return (
    <p className="text-[10px] text-white/25 text-center">
      Updated {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
    </p>
  );
}
