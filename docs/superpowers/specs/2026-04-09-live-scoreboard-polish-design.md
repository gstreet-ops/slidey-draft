# Live Scoreboard Polish — Design Spec

## Overview

Polish the live draft-night scoreboard with broadcast-energy animations, friend-group personality, sound effects, mobile tab navigation, and connection status indicators. CSS-only animations (escalate to Framer Motion only if leaderboard shuffle needs it).

## Vibe

Sports broadcast energy (ESPN/NFL Network dramatic reveals) mixed with game-night-with-friends personality (celebratory moments, playful misses). High energy but fun.

## 1. Pick Announcement Banner

When polling detects a new actual result:

- Full-width banner slides down from the top of the war room
- Team-colored background with team logo
- **"PICK IS IN"** header text, then player name + position + school
- Auto-dismisses after 5 seconds, or tap/click to dismiss early
- **Exact match**: confetti burst + "NAILED IT" overlay text
- **Miss**: brief sympathetic message ("tough break") — playful, not punishing
- CSS `@keyframes` for slide-in from top, fade-out on dismiss

## 2. Score Cascade Animation

Triggered 1 second after pick banner appears:

- User's running score total pulses and counts up to new value (number ticker effect, incrementing over ~0.5s)
- Color flash on the score: green (exact), yellow (close), orange (far), red (miss)
- Points earned badge appears briefly next to score: "+10", "+5", "+3", "+0"
- The corresponding pick row in "Your Mock vs Actual" fades in with match-type color border
- CSS transitions for color, transform (scale pulse), and opacity

## 3. Leaderboard Shuffle

Triggered 1 second after score cascade (2s after pick banner):

- Rank numbers animate to new positions
- Rows that moved up: brief green glow
- Rows that moved down: brief red glow
- Delta arrows (↑3, ↓1) animate in beside rank number
- Current user's row has persistent subtle highlight
- User hits #1: brief gold flash on their row
- If pure CSS reordering feels janky, pull in Framer Motion's `layoutId` for this component only

## 4. Sound System

### Defaults & Preferences

- **Default: on**
- Toggle button in war room header (speaker icon) to mute/unmute
- Sound preference included in onboarding flow — after team selection, a quick preferences step with sound toggle
- Preference stored in `localStorage` (no DB round-trip needed)

### Sound Effects

| Event | Sound | Duration |
|-------|-------|----------|
| Pick announced | Alert chime | <1s |
| Exact match | Celebratory ding | <1s |
| Close/far match | Neutral tick | <0.5s |
| Miss | Brief sad tone (playful) | <1s |
| Rank up | Subtle positive tone | <0.5s |

### Implementation

- Short audio files in `/public/sounds/` (MP3 or OGG, <50KB each)
- Web Audio API or simple `<audio>` element pool
- All sounds short (<1s), low default volume
- Respect `localStorage` mute preference
- A `useSoundEffects` hook that exposes `play(soundName)` and `toggleMute()`

## 5. Stale Data & Error States

- **Timestamp**: "Last updated X seconds ago" displayed below the war room header, updates every second
- **Connection lost**: If polling fails 3+ consecutive times, show an amber banner: "Connection lost — retrying..." with a manual "Refresh" button
- **Reconnected**: When polling succeeds after failures, show a brief green "Back online" flash that auto-dismisses after 2 seconds
- Track consecutive failures in the `useLiveUpdates` hook (add `failCount` state)

## 6. Mobile Polish

- **Tab navigation**: On mobile (below `lg` breakpoint), replace stacked columns with a horizontal tab bar at top: "Picks" / "My Board" / "Leaderboard"
- Only render the active tab's content (saves memory/DOM)
- **Pick banner**: Full-screen takeover on mobile for more dramatic effect
- **Sound toggle**: Accessible from mobile tab bar or header
- **Reduced animations**: On mobile, shorter animation durations and no confetti (performance)
- Use `prefers-reduced-motion` media query to disable animations for users who opt out at OS level

## Scope Boundaries

**In scope:**
- Pick announcement banner with match-type reactions
- Score cascade animation (pulse, ticker, color flash)
- Leaderboard shuffle animation
- Sound system with toggle (default on) + onboarding preference
- Stale data indicator + connection error banner
- Mobile tab navigation
- `prefers-reduced-motion` support

**Out of scope:**
- SSE/WebSocket upgrade (stays polling-based)
- Accessibility audit beyond `prefers-reduced-motion`
- Leaderboard pagination/virtualization
- Batching polling into single endpoint
- Chat or social features
