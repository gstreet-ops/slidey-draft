"use client";

import { useState, useEffect, useCallback } from "react";

type PoolUnread = {
  poolId: string;
  latestMessageAt: string | null;
};

function getLastRead(poolId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`chat-last-read-${poolId}`);
}

export function markChatRead(poolId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`chat-last-read-${poolId}`, new Date().toISOString());
}

export function useUnreadChat(enabled = true) {
  const [unreadCount, setUnreadCount] = useState(0);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread");
      if (!res.ok) return;
      const data = await res.json();
      const pools: PoolUnread[] = data.pools || [];

      let total = 0;
      for (const p of pools) {
        if (!p.latestMessageAt) continue;
        const lastRead = getLastRead(p.poolId);
        if (!lastRead || new Date(p.latestMessageAt) > new Date(lastRead)) {
          total++;
        }
      }
      setUnreadCount(total);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [enabled, check]);

  return { unreadCount, refresh: check };
}
