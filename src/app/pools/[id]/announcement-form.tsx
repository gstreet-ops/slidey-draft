"use client";

import { useState } from "react";
import { postAnnouncement } from "@/lib/actions";

export function AnnouncementForm({ poolId }: { poolId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await postAnnouncement(poolId, content);
      setContent("");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Post an announcement..."
        className="flex-1 rounded-lg bg-white/8 border border-white/[0.12] px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--steelers-gold)]"
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="rounded-lg bg-[var(--steelers-gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--steelers-gold)]/80 transition disabled:opacity-50"
      >
        Post
      </button>
    </form>
  );
}
