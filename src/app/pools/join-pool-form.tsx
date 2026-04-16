"use client";

import { useState } from "react";
import { joinPool } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function JoinPoolForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await joinPool(code);
      if (result.success && result.poolId) {
        router.push(`/pools/${result.poolId}`);
      } else {
        setError(result.message || "Failed to join pool.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        type="text"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setError("");
        }}
        placeholder="Enter pool invite code"
        className="rounded-lg bg-white/8 border border-white/[0.12] px-4 py-2.5 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[var(--gtown-highlight)] w-48"
      />
      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-white/40 transition disabled:opacity-50"
      >
        {loading ? "..." : "Join Pool"}
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </form>
  );
}
