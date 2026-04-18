"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { markChatRead } from "@/hooks/use-unread-chat";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
}

interface SystemEvent {
  id: string;
  type: "system";
  content: string;
  createdAt: string;
}

type FeedItem = (ChatMessage & { type?: undefined }) | SystemEvent;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function PoolChat({
  poolId,
  currentUserId,
  isSpectator,
  commissionerId,
  systemEvents,
}: {
  poolId: string;
  currentUserId: string;
  isSpectator: boolean;
  commissionerId: string;
  systemEvents?: SystemEvent[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const last = messages.at(-1)?.createdAt;
    if (last) lastTimestampRef.current = last;
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    const last = lastTimestampRef.current;
    const url = `/api/pools/${poolId}/chat${last ? `?after=${encodeURIComponent(last)}` : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newOnes = data.messages.filter((m: ChatMessage) => !ids.has(m.id));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
    } catch {}
  }, [poolId]);

  useEffect(() => {
    markChatRead(poolId);
    fetch(`/api/pools/${poolId}/chat`)
      .then((r) => r.json())
      .then((d) => d.messages && setMessages(d.messages))
      .catch(() => {});
  }, [poolId]);

  useEffect(() => {
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) markChatRead(poolId);
  }, [messages, poolId]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/pools/${poolId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setInput("");
        await fetchMessages();
      }
    } finally {
      setSending(false);
    }
  }

  // Merge user messages + system events into a chronological feed
  const feed: FeedItem[] = [
    ...messages,
    ...(systemEvents || []),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="bg-white/8 border border-white/[0.12] rounded-xl flex flex-col h-[400px]">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Live Feed</h3>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {feed.length === 0 && (
          <p className="text-white/40 text-sm text-center mt-8">No activity yet.</p>
        )}
        {feed.map((item) => {
          if (item.type === "system") {
            return (
              <div key={item.id} className="text-center py-1">
                <p className="text-[11px] text-white/50 bg-white/5 rounded-full px-3 py-1 inline-block">
                  {item.content}
                </p>
              </div>
            );
          }
          const m = item as ChatMessage;
          return (
            <div key={m.id} className="flex gap-2">
              {m.userImage ? (
                <img src={m.userImage} alt="" className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-white/10 shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-white/50">
                  {(m.userName || m.userEmail)[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-white/70">
                    {m.userName || m.userEmail}
                  </span>
                  {m.userId === commissionerId && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Commish</span>
                  )}
                  <span className="text-[10px] text-white/40">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="text-sm text-white/80 break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isSpectator ? (
        <div className="px-4 py-3 border-t border-white/10 text-center text-xs text-white/40">
          Spectators can read the feed but not send messages.
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Send a message..."
            className="flex-1 rounded-lg bg-white/8 border border-white/[0.12] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-lg bg-[var(--steelers-gold)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-30 hover:bg-[var(--steelers-gold)]/80 transition"
          >
            Send
          </button>
          <span className="self-center text-[10px] text-white/40">{input.length}/500</span>
        </div>
      )}
    </div>
  );
}
