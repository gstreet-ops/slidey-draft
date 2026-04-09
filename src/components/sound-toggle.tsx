"use client";

import { useSoundEffects } from "@/hooks/use-sound-effects";

export function SoundToggle() {
  const { enabled, toggleMute } = useSoundEffects();

  return (
    <button
      onClick={toggleMute}
      className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition"
      title={enabled ? "Mute sounds" : "Unmute sounds"}
    >
      {enabled ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
      <span>{enabled ? "Sound On" : "Muted"}</span>
    </button>
  );
}
