"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PoolLockControl({ poolId, status }: { poolId: string; status: string }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isLocked = currentStatus === "locked" || currentStatus === "completed";

  async function handleToggle() {
    setLoading(true);
    const newStatus = isLocked ? "open" : "locked";
    const res = await fetch(`/api/pools/${poolId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setCurrentStatus(newStatus);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/8 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            Pool Status
          </h3>
          <p className="text-xs text-white/50 mt-1">
            {isLocked
              ? "Pool is LOCKED — mock boards are frozen, live predictions and trivia are active."
              : "Pool is OPEN — members can still edit their mock boards."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`flex items-center gap-2 text-sm font-semibold ${isLocked ? "text-red-400" : "text-green-400"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isLocked ? "bg-red-400" : "bg-green-400"} animate-pulse`} />
            {isLocked ? "LOCKED" : "OPEN"}
          </span>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              isLocked
                ? "border border-white/20 bg-white/5 hover:bg-white/10"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {loading ? "..." : isLocked ? "Unlock Pool" : "Lock Pool"}
          </button>
        </div>
      </div>
    </div>
  );
}
