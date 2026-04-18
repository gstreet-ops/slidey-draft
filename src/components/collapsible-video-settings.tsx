"use client";

import { useState } from "react";
import { updatePoolSettings } from "@/lib/actions";

export function CollapsibleVideoSettings({
  poolId,
  initialUrl,
}: {
  poolId: string;
  initialUrl: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSave() {
    setSaving(true);
    try {
      await updatePoolSettings(poolId, { settings: { videoCallUrl: url || null } as unknown as Record<string, unknown> });
      setToast("Video call link saved");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setToast("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-lg">{toast}</div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition rounded-xl"
      >
        <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Video Call
        </span>
        <span className="text-xs text-[var(--text-muted)]">{expanded ? "\u25BE" : "\u25B8"}</span>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-[var(--text-muted)]">Paste a Google Meet, Zoom, or any video call link. Players will see a &quot;Join Video Call&quot; button.</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FFB612] focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-green-500 transition disabled:opacity-40"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
