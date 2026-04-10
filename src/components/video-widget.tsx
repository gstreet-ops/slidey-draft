"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VideoWidgetProps {
  poolId: string;
  poolName: string;
}

const MARGIN = 12;

export function VideoWidget({ poolId, poolName }: VideoWidgetProps) {
  const [joined, setJoined] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const jitsiRoom = `DraftDayChallenge${poolId.slice(0, 8)}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","hangup","tileview","chat"]&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  // Check if popup closed externally
  useEffect(() => {
    if (!joined || !popupRef.current) return;
    const check = setInterval(() => {
      if (popupRef.current?.closed) {
        setJoined(false);
        popupRef.current = null;
      }
    }, 1000);
    return () => clearInterval(check);
  }, [joined]);

  function openWatchParty() {
    const width = 400;
    const height = 500;
    const left = window.screenX + window.innerWidth - width - 20;
    const top = window.screenY + 80;

    popupRef.current = window.open(
      jitsiUrl,
      `watchparty-${poolId}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );
    setJoined(true);
  }

  function closeWatchParty() {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setJoined(false);
  }

  // Not joined — show invite button
  if (!joined) {
    return (
      <button
        onClick={openWatchParty}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-[var(--gtown-navy)] border border-white/20 px-5 py-3 text-white text-sm font-semibold hover:bg-white/10 transition shadow-lg"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        Watch Party
      </button>
    );
  }

  // Joined + minimized — show pill
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-[var(--gtown-navy)] border border-green-500/30 px-4 py-2.5 text-white shadow-lg hover:bg-white/10 transition"
      >
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold">Watch Party Live</span>
      </button>
    );
  }

  // Joined — show control bar
  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] rounded-xl overflow-hidden shadow-2xl border border-white/20"
      style={{ width: 260 }}
    >
      <div className="flex items-center justify-between bg-[var(--gtown-navy)] px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-white truncate">{poolName}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.focus();
              }
            }}
            className="p-1.5 text-white/50 hover:text-white transition"
            title="Focus video window"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 text-white/50 hover:text-white transition"
            title="Minimize"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={closeWatchParty}
            className="p-1.5 text-white/50 hover:text-red-400 transition"
            title="Leave watch party"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="bg-[var(--gtown-navy)]/80 px-4 py-2 text-center">
        <p className="text-[10px] text-white/30">Video running in separate window</p>
        <button
          onClick={() => popupRef.current?.focus()}
          className="text-xs text-[var(--slidey)] font-semibold hover:opacity-80 mt-1"
        >
          Bring to front ↗
        </button>
      </div>
    </div>
  );
}
