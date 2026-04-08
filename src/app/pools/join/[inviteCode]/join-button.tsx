"use client";

import { useState } from "react";
import { joinPool } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function JoinPoolButton({ inviteCode, poolId }: { inviteCode: string; poolId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setLoading(true);
    try {
      const result = await joinPool(inviteCode);
      if (result.success) {
        router.push(`/pools/${poolId}`);
      } else {
        setError(result.message || "Failed to join.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full rounded-lg bg-[var(--gtown-highlight)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Pool"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
