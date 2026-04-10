"use client";

import { useState } from "react";

export function CopyInviteLink({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `https://slidey-draft.vercel.app/pools/join/${inviteCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-xs text-white/40 mb-1">Invite link:</p>
      <div className="flex items-center gap-2">
        <code className="text-sm text-[var(--gtown-highlight)] break-all flex-1">
          {inviteUrl}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
