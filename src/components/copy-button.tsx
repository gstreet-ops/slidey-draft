"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg bg-[var(--slidey)] px-6 py-3 text-sm font-semibold text-white hover:opacity-80 transition"
    >
      {copied ? "✓ Copied!" : label || "Copy to Clipboard"}
    </button>
  );
}
