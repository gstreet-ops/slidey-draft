"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Draggable from "react-draggable";
import type { DraggableData, DraggableEvent } from "react-draggable";

interface VideoWidgetProps {
  poolId: string;
  poolName: string;
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const WIDTH = 320;
const HEIGHT = 260;
const MARGIN = 12;

function getCornerPosition(corner: Corner): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (corner) {
    case "top-left":
      return { x: MARGIN, y: MARGIN };
    case "top-right":
      return { x: vw - WIDTH - MARGIN, y: MARGIN };
    case "bottom-left":
      return { x: MARGIN, y: vh - HEIGHT - MARGIN - 60 };
    case "bottom-right":
      return { x: vw - WIDTH - MARGIN, y: vh - HEIGHT - MARGIN - 60 };
  }
}

function nearestCorner(x: number, y: number): Corner {
  if (typeof window === "undefined") return "bottom-right";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = x + WIDTH / 2;
  const cy = y + HEIGHT / 2;

  const left = cx < vw / 2;
  const top = cy < vh / 2;

  if (top && left) return "top-left";
  if (top && !left) return "top-right";
  if (!top && left) return "bottom-left";
  return "bottom-right";
}

export function VideoWidget({ poolId, poolName }: VideoWidgetProps) {
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null!);
  const jitsiContainerRef = useRef<HTMLDivElement>(null!);
  const jitsiApiRef = useRef<unknown>(null);

  const jitsiRoom = `ddc-pool-${poolId.slice(0, 8)}`;

  // Load Jitsi IFrame API script
  useEffect(() => {
    if (closed || minimized) return;
    if (jitsiApiRef.current) return;

    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setJitsiLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Don't remove script — it's cached
    };
  }, [closed, minimized]);

  // Initialize Jitsi when script loaded and container ready
  useEffect(() => {
    if (!jitsiLoaded || closed || minimized) return;
    if (jitsiApiRef.current) return;
    if (!jitsiContainerRef.current) return;

    const JitsiMeetExternalAPI = (window as unknown as Record<string, unknown>).JitsiMeetExternalAPI as new (domain: string, options: Record<string, unknown>) => unknown;
    if (!JitsiMeetExternalAPI) return;

    const api = new JitsiMeetExternalAPI("meet.jit.si", {
      roomName: jitsiRoom,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: 210,
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

    return () => {
      if (jitsiApiRef.current) {
        (jitsiApiRef.current as { dispose: () => void }).dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [jitsiLoaded, closed, minimized, jitsiRoom]);

  const handleStop = useCallback((_e: DraggableEvent, data: DraggableData) => {
    const nearest = nearestCorner(data.x, data.y);
    setSnapping(true);
    setPosition(getCornerPosition(nearest));
    setTimeout(() => setSnapping(false), 300);
  }, []);

  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    setSnapping(false);
    setPosition({ x: data.x, y: data.y });
  }, []);

  function handleClose() {
    if (jitsiApiRef.current) {
      (jitsiApiRef.current as { dispose: () => void }).dispose();
      jitsiApiRef.current = null;
    }
    setClosed(true);
  }

  if (closed) {
    return (
      <button
        onClick={() => { setClosed(false); setJitsiLoaded(false); }}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-[var(--gtown-navy)] border border-white/20 px-4 py-2 text-white text-xs font-semibold hover:bg-white/10 transition shadow-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15.6 11.6L22 7v10l-6.4-4.6M2 6h12a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
        Watch Party
      </button>
    );
  }

  const pos = position || (typeof window !== "undefined" ? getCornerPosition("bottom-right") : { x: 0, y: 0 });

  if (minimized) {
    return (
      <div
        className="fixed z-[9999] flex items-center gap-2 rounded-full bg-[var(--gtown-navy)] border border-white/20 px-4 py-2 text-white shadow-lg cursor-pointer hover:bg-white/10 transition"
        style={{ bottom: MARGIN, right: MARGIN }}
        onClick={() => setMinimized(false)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15.6 11.6L22 7v10l-6.4-4.6M2 6h12a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
        <span className="text-xs font-semibold">Watch Party</span>
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      </div>
    );
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      position={pos}
      onStop={handleStop}
      onDrag={handleDrag}
    >
      <div
        ref={nodeRef}
        className="fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-white/20"
        style={{
          width: WIDTH,
          transition: snapping ? "transform 0.3s ease-out" : "none",
        }}
      >
        {/* Header / drag handle */}
        <div className="drag-handle flex items-center justify-between bg-[var(--gtown-navy)] px-3 py-2 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-white truncate">{poolName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
              className="p-1 text-white/50 hover:text-white transition"
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
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
        <div ref={jitsiContainerRef} className="bg-black" style={{ height: 210 }}>
          {!jitsiLoaded && (
            <div className="flex items-center justify-center h-full text-white/30 text-xs">
              Loading video...
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
}
