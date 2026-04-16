"use client";

import { useState } from "react";

export function DraftControl({ isLocked }: { isLocked: boolean }) {
  const [locked, setLocked] = useState(isLocked);
  const [loading, setLoading] = useState(false);

  async function handleLock() {
    setLoading(true);
    const res = await fetch("/api/admin/lock-draft", { method: "POST" });
    if (res.ok) setLocked(true);
    setLoading(false);
  }

  async function handleUnlock() {
    setLoading(true);
    const res = await fetch("/api/admin/unlock-draft", { method: "POST" });
    if (res.ok) setLocked(false);
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT STATUS
          </h2>
          <p className="text-sm text-white/50 mt-1">
            {locked
              ? "Draft is LOCKED — /live page is active, mock boards are frozen, scoring is live."
              : "Draft is UNLOCKED — users can still edit mock boards. Lock when ready for draft night."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-2 text-sm font-semibold ${locked ? "text-red-400" : "text-green-400"}`}>
            <span className={`h-3 w-3 rounded-full ${locked ? "bg-red-400" : "bg-green-400"} animate-pulse`} />
            {locked ? "LOCKED" : "OPEN"}
          </span>
          {locked ? (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {loading ? "..." : "Unlock Draft"}
            </button>
          ) : (
            <button
              onClick={handleLock}
              disabled={loading}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50"
            >
              {loading ? "Locking..." : "Lock Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
