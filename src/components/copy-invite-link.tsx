"use client";

import { useState } from "react";

export function CopyInviteLink({ inviteCode, poolName }: { inviteCode: string; poolName?: string }) {
  const [copied, setCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);

  const inviteUrl = `https://slidey-draft.vercel.app/join/${inviteCode}`;
  const shareMessage = `Join my draft pool on Slidey! \u{1F3C8} ${inviteUrl}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyMessage() {
    await navigator.clipboard.writeText(shareMessage);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <code className="text-sm text-[var(--gtown-highlight)] break-all flex-1">
            {inviteUrl}
          </code>
          <button
            onClick={handleCopyLink}
            className="shrink-0 rounded-md bg-[var(--gtown-highlight)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-80 transition"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyMessage}
          className="text-xs text-white/40 hover:text-white/60 transition"
        >
          {msgCopied ? "Message copied!" : "Copy share message"}
        </button>
        <span className="text-xs text-white/20">&middot;</span>
        <span className="text-xs text-white/30 font-mono">Code: {inviteCode}</span>
      </div>
    </div>
  );
}
