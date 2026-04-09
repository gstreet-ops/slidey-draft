"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type SoundName = "pick-announced" | "exact-match" | "tick" | "miss" | "rank-up";

const SOUND_FILES: Record<SoundName, string> = {
  "pick-announced": "/sounds/pick-announced.wav",
  "exact-match": "/sounds/exact-match.wav",
  "tick": "/sounds/tick.wav",
  "miss": "/sounds/miss.wav",
  "rank-up": "/sounds/rank-up.wav",
};

const STORAGE_KEY = "slidey-sound-enabled";

function getStoredPreference(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(getStoredPreference);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const play = useCallback(
    async (name: SoundName) => {
      if (!enabled) return;

      const ctx = getContext();
      const url = SOUND_FILES[name];

      let buffer = bufferCache.current.get(url);
      if (!buffer) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          buffer = await ctx.decodeAudioData(arrayBuffer);
          bufferCache.current.set(url, buffer);
        } catch {
          return;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    },
    [enabled, getContext]
  );

  const toggleMute = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return { play, enabled, toggleMute };
}
