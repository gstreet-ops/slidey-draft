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
      <div className="bg-green-100 border-b border-green-200 px-6 py-3 text-center text-sm text-green-700">
        {message}
      </div>
    );
  }

  return (
    <div className="bg-[var(--steelers-gold)]/10 border-b border-[var(--steelers-gold)]/20 px-6 py-3">
      <form onSubmit={handleSubmit} className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-sm text-[var(--text-secondary)]">
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
          className="rounded bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] font-mono w-32 text-center placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--steelers-gold)]"
        />
        <button
          type="submit"
          disabled={status === "loading" || !code.trim()}
          className="rounded bg-[var(--steelers-gold)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Activate"}
        </button>
        {status === "error" && (
          <span className="text-xs text-red-700 w-full text-center">{message}</span>
        )}
      </form>
    </div>
  );
}
