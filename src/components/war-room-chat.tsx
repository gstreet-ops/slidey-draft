"use client";

import { useState, useEffect, useCallback } from "react";
import { PoolChat } from "@/components/pool-chat";
import { markChatRead } from "@/hooks/use-unread-chat";

type SystemMessage = {
  id: string;
  type: "system";
  content: string;
  createdAt: string;
};

type Props = {
  poolId: string;
  poolName: string;
  currentUserId: string;
  commissionerId: string;
  isSpectator: boolean;
};

const STORAGE_KEY = "war-room-chat-open";

export function WarRoomChat({ poolId, poolName, currentUserId, commissionerId, isSpectator }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Restore last open/closed state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setIsOpen(true);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (next) {
        markChatRead(poolId);
        setHasUnread(false);
      }
      return next;
    });
  }, [poolId]);

  // Mark as read when open
  useEffect(() => {
    if (isOpen) {
      markChatRead(poolId);
      setHasUnread(false);
    }
  }, [isOpen, poolId]);

  // Poll for unread when closed
  useEffect(() => {
    if (isOpen) return;
    async function checkUnread() {
      try {
        const res = await fetch(`/api/pools/${poolId}/chat`);
        if (!res.ok) return;
        const data = await res.json();
        const messages = data.messages || [];
        if (messages.length === 0) return;
        const latest = messages[messages.length - 1];
        const lastRead = localStorage.getItem(`chat-last-read-${poolId}`);
        if (!lastRead || new Date(latest.createdAt) > new Date(lastRead)) {
          if (latest.userId !== currentUserId) {
            setHasUnread(true);
          }
        }
      } catch {}
    }
    checkUnread();
    const id = setInterval(checkUnread, 15_000);
    return () => clearInterval(id);
  }, [isOpen, poolId, currentUserId]);

  return (
    <>
      {/* Collapsed tab — right edge */}
      {!isOpen && (
        <button
          onClick={toggle}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1 rounded-l-lg border border-r-0 border-white/10 bg-[var(--steelers-black)] px-1.5 py-3 hover:bg-white/5 transition"
        >
          {hasUnread && (
            <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-red-500 border-2 border-[var(--steelers-black)]" />
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="text-[10px] text-white/50 font-semibold [writing-mode:vertical-lr]">Chat</span>
        </button>
      )}

      {/* Expanded panel — desktop */}
      {isOpen && (
        <div className="hidden lg:flex flex-col w-[350px] shrink-0 border-l border-white/10 bg-[var(--steelers-black)] h-[calc(100vh-60px)] sticky top-[60px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{poolName}</h3>
              <span className="text-[10px] text-white/50">Chat</span>
            </div>
            <button
              onClick={toggle}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
          {/* Chat body */}
          <div className="flex-1 min-h-0">
            <PoolChat
              poolId={poolId}
              currentUserId={currentUserId}
              isSpectator={isSpectator}
              commissionerId={commissionerId}
            />
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={toggle} />
          {/* Panel */}
          <div className="relative ml-auto w-full max-w-md h-full bg-[var(--steelers-black)] border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-white">{poolName}</h3>
                <span className="text-[10px] text-white/50">Chat</span>
              </div>
              <button
                onClick={toggle}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <PoolChat
                poolId={poolId}
                currentUserId={currentUserId}
                isSpectator={isSpectator}
                commissionerId={commissionerId}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
