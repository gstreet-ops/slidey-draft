"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteCodeInput() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) {
      router.push(`/join/${trimmed}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center justify-center gap-2 pt-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="INVITE CODE"
        maxLength={10}
        className="w-40 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#FFB612] text-center tracking-wider"
      />
      <button
        type="submit"
        disabled={!code.trim()}
        className="rounded-lg bg-[#FFB612] px-6 py-3 text-sm font-bold text-white hover:bg-[#FFB612]/80 transition disabled:opacity-50"
      >
        Join
      </button>
    </form>
  );
}
