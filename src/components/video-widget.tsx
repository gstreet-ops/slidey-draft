"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VideoWidgetProps {
  poolId: string;
  poolName: string;
}

const WIDTH = 320;
const HEIGHT = 250;
const MARGIN = 12;

function snapToCorner(x: number, y: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = x + WIDTH / 2;
  const cy = y + HEIGHT / 2;

  const snapX = cx < vw / 2 ? MARGIN : vw - WIDTH - MARGIN;
  const snapY = cy < vh / 2 ? MARGIN : vh - HEIGHT - MARGIN - 60;
  return { x: snapX, y: snapY };
}

export function VideoWidget({ poolId, poolName }: VideoWidgetProps) {
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<unknown>(null);

  const jitsiRoom = `ddc-pool-${poolId.slice(0, 8)}`;

  // Set initial position
  useEffect(() => {
    if (!pos && typeof window !== "undefined") {
      setPos({
        x: window.innerWidth - WIDTH - MARGIN,
        y: window.innerHeight - HEIGHT - MARGIN - 60,
      });
    }
  }, [pos]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pos) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      setDragging(false);
      const finalX = e.clientX - dragOffset.current.x;
      const finalY = e.clientY - dragOffset.current.y;
      setPos(snapToCorner(finalX, finalY));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  // Load Jitsi IFrame API
  useEffect(() => {
    if (closed || minimized) return;
    if (jitsiApiRef.current) return;

    if ((window as unknown as Record<string, unknown>).JitsiMeetExternalAPI) {
      setJitsiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setJitsiLoaded(true);
    script.onerror = () => setError("Failed to load video chat");
    document.head.appendChild(script);
  }, [closed, minimized]);

  // Initialize Jitsi
  useEffect(() => {
    if (!jitsiLoaded || closed || minimized) return;
    if (jitsiApiRef.current) return;
    if (!jitsiContainerRef.current) return;

    const JitsiAPI = (window as unknown as Record<string, unknown>).JitsiMeetExternalAPI as
      | (new (domain: string, options: Record<string, unknown>) => { dispose: () => void })
      | undefined;

    if (!JitsiAPI) {
      setError("Jitsi API not available");
      return;
    }

    try {
      const api = new JitsiAPI("meet.jit.si", {
        roomName: jitsiRoom,
        parentNode: jitsiContainerRef.current,
        width: "100%",
        height: 200,
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "tileview"],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
      });
      jitsiApiRef.current = api;
    } catch (err) {
      setError("Video error: " + (err instanceof Error ? err.message : String(err)));
    }

    return () => {
      if (jitsiApiRef.current) {
        (jitsiApiRef.current as { dispose: () => void }).dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [jitsiLoaded, closed, minimized, jitsiRoom]);

  function handleClose() {
    if (jitsiApiRef.current) {
      (jitsiApiRef.current as { dispose: () => void }).dispose();
      jitsiApiRef.current = null;
    }
    setClosed(true);
  }

  // Closed state — small reopen button
  if (closed) {
    return (
      <button
        onClick={() => { setClosed(false); setJitsiLoaded(false); setError(null); }}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-[var(--gtown-navy)] border border-white/20 px-4 py-2.5 text-white text-xs font-semibold hover:bg-white/10 transition shadow-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        Watch Party
      </button>
    );
  }

  // Minimized state — pill
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-[var(--gtown-navy)] border border-white/20 px-4 py-2.5 text-white shadow-lg hover:bg-white/10 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <span className="text-xs font-semibold">Watch Party</span>
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      </button>
    );
  }

  if (!pos) return null;

  return (
    <div
      ref={widgetRef}
      className="fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-white/20"
      style={{
        width: WIDTH,
        left: pos.x,
        top: pos.y,
        transition: dragging ? "none" : "left 0.3s ease-out, top 0.3s ease-out",
      }}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between bg-[var(--gtown-navy)] px-3 py-2 select-none"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-white truncate">{poolName}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized(true)}
            className="p-1 text-white/50 hover:text-white transition"
            title="Minimize"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="p-1 text-white/50 hover:text-white transition"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Jitsi container */}
      <div ref={jitsiContainerRef} className="bg-black" style={{ height: 200 }}>
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 text-xs gap-2 px-4 text-center">
            <p>{error}</p>
            <button
              onClick={() => { setError(null); setJitsiLoaded(false); }}
              className="text-white/50 hover:text-white text-xs underline"
            >
              Retry
            </button>
          </div>
        ) : !jitsiLoaded ? (
          <div className="flex items-center justify-center h-full text-white/30 text-xs">
            Loading video...
          </div>
        ) : null}
      </div>
    </div>
  );
}
