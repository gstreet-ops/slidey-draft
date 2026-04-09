# Live Scoreboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add broadcast-energy animations, sound effects, connection status, and mobile tab navigation to the live draft-night scoreboard.

**Architecture:** CSS keyframe animations for pick announcements and score cascades. A `useSoundEffects` hook backed by Web Audio API + localStorage preferences. Enhanced `useLiveUpdates` hook with failure tracking. Mobile tab bar replaces stacked columns below `lg` breakpoint. New pick detection by comparing previous/current result counts.

**Tech Stack:** React, Tailwind CSS, CSS @keyframes, Web Audio API, localStorage

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/app/globals.css` | Add custom @keyframes animations |
| `src/hooks/use-sound-effects.ts` | NEW — Sound playback + mute toggle via localStorage |
| `src/hooks/use-live-updates.ts` | MODIFY — Add `failCount` to return value for connection status |
| `src/components/pick-announcement.tsx` | NEW — "PICK IS IN" banner with team colors + confetti |
| `src/components/score-cascade.tsx` | NEW — Animated score ticker + points badge |
| `src/components/connection-status.tsx` | NEW — Stale data indicator + error banner |
| `src/components/mobile-tab-bar.tsx` | NEW — Tab navigation for mobile war room |
| `src/app/live/war-room.tsx` | MODIFY — Integrate all new components, new pick detection, mobile tabs |
| `src/app/live/page.tsx` | MODIFY — Add sound toggle to header |
| `src/app/onboarding/team/page.tsx` | MODIFY — Add sound preference step |
| `public/sounds/` | NEW — Audio files (pick-announced.mp3, exact-match.mp3, tick.mp3, miss.mp3, rank-up.mp3) |

---

### Task 1: CSS Keyframe Animations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add keyframes to globals.css**

Add these after the existing CSS in `src/app/globals.css`:

```css
/* ── Live Scoreboard Animations ───────────── */

@keyframes slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slide-up-out {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-100%); opacity: 0; }
}

@keyframes score-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

@keyframes points-pop {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  50% { transform: translateY(-8px) scale(1.1); opacity: 1; }
  100% { transform: translateY(-16px) scale(1); opacity: 0; }
}

@keyframes row-glow-green {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(34, 197, 94, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

@keyframes row-glow-red {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@keyframes row-glow-gold {
  0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.5); }
  50% { box-shadow: 0 0 20px 6px rgba(234, 179, 8, 0.4); }
  100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(720deg); opacity: 0; }
}

@keyframes banner-dismiss {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-100%); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add CSS keyframe animations for live scoreboard"
```

---

### Task 2: Sound Effects Hook

**Files:**
- Create: `src/hooks/use-sound-effects.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/use-sound-effects.ts`:

```ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type SoundName = "pick-announced" | "exact-match" | "tick" | "miss" | "rank-up";

const SOUND_FILES: Record<SoundName, string> = {
  "pick-announced": "/sounds/pick-announced.mp3",
  "exact-match": "/sounds/exact-match.mp3",
  "tick": "/sounds/tick.mp3",
  "miss": "/sounds/miss.mp3",
  "rank-up": "/sounds/rank-up.mp3",
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
          return; // Silently fail if sound file missing
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.3; // Low default volume
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-sound-effects.ts
git commit -m "feat: add useSoundEffects hook with localStorage preference"
```

---

### Task 3: Placeholder Sound Files

**Files:**
- Create: `public/sounds/pick-announced.mp3`
- Create: `public/sounds/exact-match.mp3`
- Create: `public/sounds/tick.mp3`
- Create: `public/sounds/miss.mp3`
- Create: `public/sounds/rank-up.mp3`

- [ ] **Step 1: Create placeholder sound files**

We need short audio files. For now, generate minimal valid MP3 files as placeholders. The user can replace them with real sounds later.

Use `ffmpeg` if available, or create empty placeholder files:

```bash
mkdir -p public/sounds
# Generate 0.3s sine tone at different frequencies for each sound
ffmpeg -f lavfi -i "sine=frequency=880:duration=0.3" -b:a 32k public/sounds/pick-announced.mp3 -y 2>/dev/null
ffmpeg -f lavfi -i "sine=frequency=1200:duration=0.3" -b:a 32k public/sounds/exact-match.mp3 -y 2>/dev/null
ffmpeg -f lavfi -i "sine=frequency=600:duration=0.2" -b:a 32k public/sounds/tick.mp3 -y 2>/dev/null
ffmpeg -f lavfi -i "sine=frequency=300:duration=0.4" -b:a 32k public/sounds/miss.mp3 -y 2>/dev/null
ffmpeg -f lavfi -i "sine=frequency=1000:duration=0.25" -b:a 32k public/sounds/rank-up.mp3 -y 2>/dev/null
```

If ffmpeg is not available, create empty files as placeholders:
```bash
mkdir -p public/sounds
touch public/sounds/pick-announced.mp3 public/sounds/exact-match.mp3 public/sounds/tick.mp3 public/sounds/miss.mp3 public/sounds/rank-up.mp3
```

- [ ] **Step 2: Commit**

```bash
git add public/sounds/
git commit -m "feat: add placeholder sound effect files"
```

---

### Task 4: Enhance useLiveUpdates with failCount

**Files:**
- Modify: `src/hooks/use-live-updates.ts`

- [ ] **Step 1: Add failCount tracking**

Update `src/hooks/use-live-updates.ts`. Add a `failCount` state and include it in the return value. Increment on error, reset on success:

```ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface LiveUpdateConfig {
  endpoints: string[];
  interval?: number;
  enabled?: boolean;
  method?: "GET" | "POST";
}

export interface LiveUpdateResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  failCount: number;
  refresh: () => void;
}

export function useLiveUpdates<T = unknown>(
  config: LiveUpdateConfig
): LiveUpdateResult<T> {
  const { endpoints, interval = 30_000, enabled = true, method } = config;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failCount, setFailCount] = useState(0);
  const mountedRef = useRef(true);
  const endpointsKey = endpoints.join(",");
  const methodRef = useRef(method);
  methodRef.current = method;

  const fetchAll = useCallback(async () => {
    if (!enabled || endpoints.length === 0) return;

    try {
      const results = await Promise.all(
        endpoints.map(async (url) => {
          const res = await fetch(url, { cache: "no-store", method: methodRef.current || "GET" });
          if (!res.ok) throw new Error(`${res.status} from ${url}`);
          return res.json();
        })
      );

      if (!mountedRef.current) return;

      const value = endpoints.length === 1 ? results[0] : results;
      setData(value as T);
      setError(null);
      setFailCount(0);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setFailCount((prev) => prev + 1);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- endpointsKey is a stable derived key for endpoints
  }, [endpointsKey, enabled]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    fetchAll();
    const id = setInterval(fetchAll, interval);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAll, interval, enabled]);

  return { data, isLoading, error, lastUpdated, failCount, refresh: fetchAll };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-live-updates.ts
git commit -m "feat: add failCount to useLiveUpdates for connection status"
```

---

### Task 5: Connection Status Component

**Files:**
- Create: `src/components/connection-status.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/connection-status.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

type Props = {
  lastUpdated: Date | null;
  failCount: number;
  onRefresh: () => void;
};

export function ConnectionStatus({ lastUpdated, failCount, onRefresh }: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Connection lost banner
  if (failCount >= 3) {
    return (
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 flex items-center justify-between"
           style={{ animation: "fade-in 0.3s ease-out" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 text-sm font-medium">Connection lost — retrying...</span>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Reconnected flash (failCount went from >0 back to 0)
  // This is handled by parent tracking previous failCount

  // Normal: show last updated
  if (!lastUpdated) return null;

  return (
    <p className="text-[10px] text-white/25 text-center">
      Updated {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
    </p>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connection-status.tsx
git commit -m "feat: add ConnectionStatus component for stale data and errors"
```

---

### Task 6: Pick Announcement Banner

**Files:**
- Create: `src/components/pick-announcement.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/pick-announcement.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";

type Props = {
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl?: string | null;
  matchType: string | null; // "exact" | "close" | "far" | "miss" | null
  onDismiss: () => void;
};

const MATCH_MESSAGES: Record<string, string> = {
  exact: "NAILED IT!",
  close: "Close call!",
  far: "Not quite...",
  miss: "Tough break",
};

export function PickAnnouncement({
  pickNumber,
  playerName,
  playerPosition,
  playerSchool,
  teamName,
  teamAbbreviation,
  teamPrimaryColor,
  teamLogoUrl,
  matchType,
  onDismiss,
}: Props) {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDismissing(true);
      setTimeout(onDismiss, 400);
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  function handleClick() {
    setDismissing(true);
    clearTimeout(timerRef.current);
    setTimeout(onDismiss, 400);
  }

  const bgColor = teamPrimaryColor || "#333";

  return (
    <div
      className="relative overflow-hidden rounded-xl cursor-pointer"
      style={{
        animation: dismissing ? "banner-dismiss 0.4s ease-in forwards" : "slide-down 0.5s ease-out",
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
      }}
      onClick={handleClick}
    >
      <div className="relative z-10 px-6 py-5 flex items-center gap-4">
        {teamLogoUrl && (
          <img src={teamLogoUrl} alt={teamName} className="h-14 w-14 object-contain opacity-90" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            PICK #{pickNumber} IS IN
          </p>
          <p className="text-2xl font-bold text-white truncate" style={{ fontFamily: "var(--font-display)" }}>
            {playerName}
          </p>
          <p className="text-sm text-white/70">
            {playerPosition} &middot; {playerSchool} &middot; {teamAbbreviation}
          </p>
        </div>
        {matchType && (
          <div className="shrink-0 text-right">
            <p className={`text-lg font-bold ${matchType === "exact" ? "text-green-300" : "text-white/80"}`}
               style={{ fontFamily: "var(--font-display)" }}>
              {MATCH_MESSAGES[matchType] || ""}
            </p>
          </div>
        )}
      </div>

      {/* Confetti for exact matches */}
      {matchType === "exact" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 30}%`,
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"][i % 5],
                animation: `confetti-fall ${0.8 + Math.random() * 1.2}s ease-out ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pick-announcement.tsx
git commit -m "feat: add PickAnnouncement banner with confetti for exact matches"
```

---

### Task 7: Score Cascade Component

**Files:**
- Create: `src/components/score-cascade.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/score-cascade.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

type Props = {
  targetScore: number;
  pointsEarned: number;
  matchType: string; // "exact" | "close" | "far" | "miss"
  animate: boolean; // trigger animation
};

const MATCH_COLORS: Record<string, string> = {
  exact: "text-green-400",
  close: "text-yellow-400",
  far: "text-orange-400",
  miss: "text-red-400",
};

export function ScoreCascade({ targetScore, pointsEarned, matchType, animate }: Props) {
  const [displayScore, setDisplayScore] = useState(targetScore - pointsEarned);
  const [showBadge, setShowBadge] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!animate || animatedRef.current) return;
    animatedRef.current = true;

    const startScore = targetScore - pointsEarned;
    const duration = 500; // ms
    const startTime = Date.now();

    // Show points badge
    setShowBadge(true);
    setPulsing(true);

    // Ticker animation
    const ticker = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(startScore + (pointsEarned * progress)));

      if (progress >= 1) {
        clearInterval(ticker);
        setTimeout(() => setPulsing(false), 300);
        setTimeout(() => setShowBadge(false), 2000);
      }
    }, 16);

    return () => clearInterval(ticker);
  }, [animate, targetScore, pointsEarned]);

  // Reset animation flag when score target changes
  useEffect(() => {
    animatedRef.current = false;
  }, [targetScore]);

  return (
    <div className="relative text-right">
      <span
        className={`text-2xl font-bold text-white ${pulsing ? "" : ""}`}
        style={pulsing ? { animation: "score-pulse 0.6s ease-in-out" } : undefined}
      >
        {displayScore}
      </span>
      <span className="text-sm text-white/40 ml-1">pts</span>

      {showBadge && pointsEarned > 0 && (
        <span
          className={`absolute -top-4 right-0 text-sm font-bold ${MATCH_COLORS[matchType] || "text-white"}`}
          style={{ animation: "points-pop 2s ease-out forwards" }}
        >
          +{pointsEarned}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/score-cascade.tsx
git commit -m "feat: add ScoreCascade animated score ticker component"
```

---

### Task 8: Mobile Tab Bar Component

**Files:**
- Create: `src/components/mobile-tab-bar.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/mobile-tab-bar.tsx`:

```tsx
"use client";

import { useState } from "react";

type Tab = {
  id: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
};

export function MobileTabBar({ tabs, defaultTab, children }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  return (
    <div className="lg:hidden">
      <div className="flex border-b border-white/10 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition ${
              activeTab === tab.id
                ? "text-white border-b-2 border-[var(--slidey)]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(activeTab)}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile-tab-bar.tsx
git commit -m "feat: add MobileTabBar component for live war room"
```

---

### Task 9: Integrate Everything into WarRoom

**Files:**
- Modify: `src/app/live/war-room.tsx`

This is the largest task — it wires all new components into the existing war room. The key changes:

1. Track previous results count to detect new picks
2. Show PickAnnouncement banner when a new pick arrives
3. Replace static score with ScoreCascade
4. Add leaderboard glow animations on rank changes
5. Add ConnectionStatus
6. Add MobileTabBar for mobile layout
7. Play sounds on events

- [ ] **Step 1: Rewrite war-room.tsx with all integrations**

Replace `src/app/live/war-room.tsx` entirely:

```tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { PickAnnouncement } from "@/components/pick-announcement";
import { ScoreCascade } from "@/components/score-cascade";
import { ConnectionStatus } from "@/components/connection-status";
import { MobileTabBar } from "@/components/mobile-tab-bar";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl?: string | null;
};

type ActualResult = {
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
};

type LeaderboardEntry = {
  boardId: string;
  totalScore: number;
  correctExact: number;
  accuracyPct: number;
  previousRank: number | null;
  currentRank: number;
  userName: string;
  userRole: string;
  userId: string | null;
  teamLogoUrl: string | null;
  teamPrimaryColor: string | null;
  teamAbbreviation: string | null;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  picksScored: number;
};

type BoardPick = {
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  autoFilled: boolean;
};

type PickScore = {
  pickNumber: number;
  pointsAwarded: number;
  matchType: string;
};

type Props = {
  userId: string | null;
  userBoardId: string | null;
  initialResults: ActualResult[];
  draftOrder: DraftSlot[];
  season: number;
};

const MATCH_COLORS: Record<string, string> = {
  exact: "border-green-500/40 bg-green-500/10",
  close: "border-yellow-500/40 bg-yellow-500/10",
  far: "border-orange-500/40 bg-orange-500/10",
  miss: "border-red-500/40 bg-red-500/10",
};

const MATCH_LABELS: Record<string, string> = {
  exact: "+10",
  close: "+5",
  far: "+3",
  miss: "0",
};

const MOBILE_TABS = [
  { id: "picks", label: "Picks" },
  { id: "board", label: "My Board" },
  { id: "leaderboard", label: "Leaderboard" },
];

export function WarRoom({ userId, userBoardId, initialResults, draftOrder, season }: Props) {
  const { play } = useSoundEffects();
  const [announcement, setAnnouncement] = useState<ActualResult | null>(null);
  const [latestMatchType, setLatestMatchType] = useState<string | null>(null);
  const [animateScore, setAnimateScore] = useState(false);
  const [glowingRows, setGlowingRows] = useState<Map<string, "up" | "down" | "first">>(new Map());
  const prevResultCountRef = useRef(initialResults.length);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const { data: lbData, lastUpdated: lbUpdated, failCount: lbFailCount, refresh: lbRefresh } = useLiveUpdates<LeaderboardData>({
    endpoints: [`/api/leaderboard?season=${season}`],
    interval: 30_000,
    enabled: true,
  });

  const { lastUpdated: syncUpdated, failCount: syncFailCount, refresh: syncRefresh } = useLiveUpdates<{ totalPicks: number }>({
    endpoints: ["/api/draft/sync"],
    interval: 30_000,
    enabled: true,
    method: "POST",
  });

  const { data: boardData } = useLiveUpdates<{ picks: BoardPick[]; scores: PickScore[] } | null>({
    endpoints: userBoardId ? [`/api/board/${userBoardId}/live`] : [],
    interval: 30_000,
    enabled: !!userBoardId,
  });

  const { data: resultsData } = useLiveUpdates<ActualResult[]>({
    endpoints: [`/api/draft/results?season=${season}`],
    interval: 30_000,
    enabled: true,
  });

  const results = resultsData || initialResults;
  const leaderboard = lbData?.leaderboard || [];
  const picksScored = lbData?.picksScored || results.length;
  const userPicks = boardData?.picks || [];
  const userScores = boardData?.scores || [];

  const pickMap = new Map(userPicks.map((p) => [p.pickNumber, p]));
  const scoreMap = new Map(userScores.map((s) => [s.pickNumber, s]));
  const resultMap = new Map(results.map((r) => [r.pickNumber, r]));
  const runningTotal = userScores.reduce((sum, s) => sum + s.pointsAwarded, 0);

  const lastUpdated = lbUpdated || syncUpdated;
  const maxFailCount = Math.max(lbFailCount, syncFailCount);
  const handleRefresh = useCallback(() => { lbRefresh(); syncRefresh(); }, [lbRefresh, syncRefresh]);

  // Detect new picks
  useEffect(() => {
    if (results.length > prevResultCountRef.current) {
      const newPick = results[results.length - 1];
      if (newPick) {
        // Show announcement
        setAnnouncement(newPick);
        play("pick-announced");

        // Determine match type for this pick after a delay
        setTimeout(() => {
          const score = scoreMap.get(newPick.pickNumber);
          const matchType = score?.matchType || null;
          setLatestMatchType(matchType);
          setAnimateScore(true);

          if (matchType === "exact") {
            play("exact-match");
          } else if (matchType === "close" || matchType === "far") {
            play("tick");
          } else if (matchType === "miss") {
            play("miss");
          }
        }, 1000);
      }
    }
    prevResultCountRef.current = results.length;
  }, [results, scoreMap, play]);

  // Detect leaderboard rank changes
  useEffect(() => {
    if (leaderboard.length === 0) return;

    const newGlows = new Map<string, "up" | "down" | "first">();

    leaderboard.forEach((entry) => {
      const prevRank = prevRanksRef.current.get(entry.boardId);
      if (prevRank !== undefined) {
        if (entry.currentRank < prevRank) {
          newGlows.set(entry.boardId, entry.currentRank === 1 ? "first" : "up");
          if (entry.userId === userId) play("rank-up");
        } else if (entry.currentRank > prevRank) {
          newGlows.set(entry.boardId, "down");
        }
      }
    });

    if (newGlows.size > 0) {
      setGlowingRows(newGlows);
      setTimeout(() => setGlowingRows(new Map()), 1500);
    }

    const newRanks = new Map<string, number>();
    leaderboard.forEach((e) => newRanks.set(e.boardId, e.currentRank));
    prevRanksRef.current = newRanks;
  }, [leaderboard, userId, play]);

  // Determine latest score info for cascade
  const latestScore = userScores.length > 0 ? userScores[userScores.length - 1] : null;

  function getRowGlowStyle(boardId: string): React.CSSProperties | undefined {
    const glow = glowingRows.get(boardId);
    if (!glow) return undefined;
    if (glow === "first") return { animation: "row-glow-gold 1.5s ease-out" };
    if (glow === "up") return { animation: "row-glow-green 1.5s ease-out" };
    return { animation: "row-glow-red 1.5s ease-out" };
  }

  // Shared column renderers
  const picksColumn = (
    <div>
      <h2 className="text-lg font-bold text-white tracking-wide mb-4" style={{ fontFamily: "var(--font-display)" }}>ACTUAL PICKS</h2>
      <div className="space-y-2 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {results.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">Waiting for Round 1 to begin...</p>
        ) : (
          [...results].reverse().map((result) => (
            <div key={result.pickNumber} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                 style={result.pickNumber === results.length ? { animation: "fade-in 0.5s ease-out" } : undefined}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: result.teamPrimaryColor || "#333" }}>
                {result.pickNumber}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{result.playerName}</p>
                <p className="text-xs text-white/40">{result.playerPosition} &middot; {result.playerSchool} &middot; {result.teamAbbreviation}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const boardColumn = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>YOUR MOCK VS ACTUAL</h2>
        {userPicks.length > 0 && (
          <ScoreCascade
            targetScore={runningTotal}
            pointsEarned={latestScore?.pointsAwarded || 0}
            matchType={latestScore?.matchType || "miss"}
            animate={animateScore}
          />
        )}
      </div>

      {!userBoardId ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-white/40">You don&apos;t have a mock draft to score.</p>
        </div>
      ) : (
        <div className="space-y-1.5 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {draftOrder.map((slot) => {
            const pick = pickMap.get(slot.pickNumber);
            const score = scoreMap.get(slot.pickNumber);
            const result = resultMap.get(slot.pickNumber);
            const matchType = score?.matchType || (result ? "miss" : null);

            return (
              <div key={slot.pickNumber}
                   className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${matchType ? MATCH_COLORS[matchType] || "border-white/10 bg-white/5" : "border-white/10 bg-white/5"}`}
                   style={result && slot.pickNumber === results.length ? { animation: "fade-in 0.5s ease-out" } : undefined}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}>{slot.pickNumber}</div>
                <div className="flex-1 min-w-0">
                  {pick ? (
                    <p className={`text-sm text-white/80 truncate ${pick.autoFilled ? "italic" : ""}`}>
                      {pick.playerName}
                      <span className="text-xs text-white/40 ml-1">{pick.playerPosition}</span>
                      {pick.autoFilled && <span className="ml-1 text-[9px] text-yellow-400/70 font-medium">BPA</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-white/20">&mdash;</p>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  {result ? (
                    <p className="text-sm text-white/80 truncate">
                      {result.playerName}
                      <span className="text-xs text-white/40 ml-1">{result.playerPosition}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-white/20">pending</p>
                  )}
                </div>
                <div className="w-10 shrink-0 text-right">
                  {matchType && (
                    <span className={`text-xs font-bold whitespace-nowrap ${matchType === "exact" ? "text-green-400" : matchType === "close" ? "text-yellow-400" : matchType === "far" ? "text-orange-400" : "text-red-400"}`}>
                      {MATCH_LABELS[matchType]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const leaderboardColumn = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>LEADERBOARD</h2>
        <span className="text-xs text-white/40">{picksScored} of 32 picks in</span>
      </div>
      <div className="space-y-1.5 lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {leaderboard.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">Scores will appear as picks come in</p>
        ) : (
          leaderboard.map((entry) => {
            const isUser = entry.userId === userId;
            const rankDelta = entry.previousRank ? entry.previousRank - entry.currentRank : 0;
            return (
              <div
                key={entry.boardId}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${isUser ? "border-[var(--slidey)]/30 bg-[var(--slidey)]/10" : "border-white/10 bg-white/5"}`}
                style={{
                  borderLeftWidth: entry.teamPrimaryColor ? 3 : undefined,
                  borderLeftColor: entry.teamPrimaryColor || undefined,
                  ...getRowGlowStyle(entry.boardId),
                }}
              >
                <span className="w-5 text-center text-sm font-bold text-white/60">{entry.currentRank}</span>
                {entry.teamLogoUrl && (
                  <img src={entry.teamLogoUrl} alt="" className="h-6 w-6 shrink-0 object-contain" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white truncate block">{entry.userName}</span>
                  <p className="text-xs text-white/30">{entry.accuracyPct?.toFixed(1)}% accuracy</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                  {rankDelta !== 0 && (
                    <p className={`text-[10px] font-medium ${rankDelta > 0 ? "text-green-400" : "text-red-400"}`}
                       style={{ animation: "fade-in 0.5s ease-out" }}>
                      {rankDelta > 0 ? `↑${rankDelta}` : `↓${Math.abs(rankDelta)}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2">
        <ConnectionStatus lastUpdated={lastUpdated} failCount={maxFailCount} onRefresh={handleRefresh} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/* Pick Announcement Banner */}
      {announcement && (
        <div className="mb-4">
          <PickAnnouncement
            pickNumber={announcement.pickNumber}
            playerName={announcement.playerName}
            playerPosition={announcement.playerPosition}
            playerSchool={announcement.playerSchool}
            teamName={announcement.teamName}
            teamAbbreviation={announcement.teamAbbreviation}
            teamPrimaryColor={announcement.teamPrimaryColor}
            matchType={latestMatchType}
            onDismiss={() => { setAnnouncement(null); setLatestMatchType(null); setAnimateScore(false); }}
          />
        </div>
      )}

      {/* Mobile: Tab bar layout */}
      <MobileTabBar tabs={MOBILE_TABS} defaultTab="board">
        {(activeTab) => (
          <>
            {activeTab === "picks" && picksColumn}
            {activeTab === "board" && boardColumn}
            {activeTab === "leaderboard" && leaderboardColumn}
          </>
        )}
      </MobileTabBar>

      {/* Desktop: 3-column grid */}
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr_320px] gap-6">
        {picksColumn}
        {boardColumn}
        {leaderboardColumn}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build passes**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/live/war-room.tsx
git commit -m "feat: integrate animations, sounds, mobile tabs into war room"
```

---

### Task 10: Add Sound Toggle to Live Page Header

**Files:**
- Modify: `src/app/live/page.tsx`

- [ ] **Step 1: Create a client wrapper for the header sound toggle**

The live page is a server component, so we need a small client component for the sound toggle. Create `src/components/sound-toggle.tsx`:

```tsx
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
```

- [ ] **Step 2: Update live page header**

In `src/app/live/page.tsx`, add the SoundToggle import and update the header. Also fix the `--lions-blue` reference to use `--slidey`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getActualResults, getDraftOrder, getPoolsForUser, getPlayers } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { WarRoom } from "./war-room";
import { LivePredictionWidget } from "@/components/live-prediction";
import { SoundToggle } from "@/components/sound-toggle";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await auth();
  const locked = await isDraftLocked();

  if (!locked) redirect("/dashboard");

  const season = 2026;
  const draftOrder = await getDraftOrder(season);
  const userId = session?.user?.id || null;
  const results = await getActualResults(season);
  const allPlayers = await getPlayers();

  let userBoardId: string | null = null;
  let userPools: { poolId: string; poolName: string }[] = [];
  if (userId) {
    const board = await getUserBoard(userId, season);
    userBoardId = board?.id || null;
    if (session?.user?.status === "active") {
      userPools = await getPoolsForUser(userId);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--slidey)]">.COM</span> DRAFT
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">LIVE</span>
            </span>
            <SoundToggle />
            <nav className="flex gap-3 text-sm text-white/60">
              <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
              {session?.user && <span className="text-white/40">{session.user.name || session.user.email}</span>}
            </nav>
          </div>
        </div>
      </header>

      {userPools.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4">
          <LivePredictionWidget
            poolId={userPools[0].poolId}
            poolName={userPools[0].poolName}
            allPlayers={allPlayers}
            actualResults={results}
            draftOrder={draftOrder.map((d) => ({
              pickNumber: d.pickNumber,
              teamName: d.teamName,
              teamAbbreviation: d.teamAbbreviation,
            }))}
          />
        </div>
      )}

      <WarRoom
        userId={userId}
        userBoardId={userBoardId}
        initialResults={results}
        draftOrder={draftOrder}
        season={season}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sound-toggle.tsx src/app/live/page.tsx
git commit -m "feat: add sound toggle to live page header"
```

---

### Task 11: Add Sound Preference to Onboarding

**Files:**
- Modify: `src/app/onboarding/team/page.tsx`

- [ ] **Step 1: Create a sound preference component for onboarding**

Create `src/components/sound-preference.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "slidey-sound-enabled";

export function SoundPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setEnabled(stored === "true");
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-white">Draft Night Sounds</p>
        <p className="text-xs text-white/40 mt-0.5">Pick alerts, score chimes, and reactions</p>
      </div>
      <button
        onClick={toggle}
        className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? "bg-[var(--slidey)]" : "bg-white/20"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add SoundPreference to onboarding page**

Update `src/app/onboarding/team/page.tsx` to include the sound toggle below the team picker, before the skip link:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";
import { SoundPreference } from "@/components/sound-preference";

export const dynamic = "force-dynamic";

export default async function OnboardingTeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (session.user.favoriteTeam) redirect("/dashboard");

  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      abbreviation: teams.abbreviation,
      primaryColor: teams.primaryColor,
      logoUrl: teams.logoUrl,
    })
    .from(teams)
    .orderBy(asc(teams.name));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--gtown-navy)] px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <h1
          className="text-4xl font-bold text-white tracking-wider sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PICK YOUR TEAM
        </h1>
        <p className="mt-3 text-white/50 text-sm">
          Choose your favorite NFL team to personalize your experience.
        </p>

        <div className="mt-8">
          <TeamPicker
            teams={allTeams.map((t) => ({
              ...t,
              primaryColor: t.primaryColor || "#4A7AB5",
            }))}
            redirectTo="/dashboard"
          />
        </div>

        <div className="mt-8 max-w-sm mx-auto">
          <SoundPreference />
        </div>

        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-white/30 hover:text-white/50 transition"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sound-preference.tsx src/app/onboarding/team/page.tsx
git commit -m "feat: add sound preference toggle to onboarding"
```

---

### Task 12: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
npx next build
```

Expected: Build succeeds with all new routes and components.

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: All existing tests still pass.

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "feat: live scoreboard polish — complete implementation"
```
