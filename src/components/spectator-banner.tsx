"use client";

import { useState } from "react";
import { claimInviteCode } from "@/lib/actions";

export function SpectatorBanner() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("loading");
    try {
      const result = await claimInviteCode(code);
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-green-500/20 border-b border-green-500/30 px-6 py-3 text-center text-sm text-green-300">
        {message}
      </div>
    );
  }

  return (
    <div className="bg-[var(--gtown-highlight)]/10 border-b border-[var(--gtown-highlight)]/20 px-6 py-3">
      <form onSubmit={handleSubmit} className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-sm text-white/70">
          Want to compete? Enter an invite code to unlock full access.
        </span>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (status === "error") setStatus("idle");
          }}
          placeholder="INVITE CODE"
          className="rounded bg-white/10 border border-white/20 px-3 py-1.5 text-sm text-white font-mono w-32 text-center placeholder:text-white/30 focus:outline-none focus:border-[var(--gtown-highlight)]"
        />
        <button
          type="submit"
          disabled={status === "loading" || !code.trim()}
          className="rounded bg-[var(--gtown-highlight)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Activate"}
        </button>
        {status === "error" && (
          <span className="text-xs text-red-400 w-full text-center">{message}</span>
        )}
      </form>
    </div>
  );
}
