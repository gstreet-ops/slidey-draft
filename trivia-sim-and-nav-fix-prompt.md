# Trivia in Draft Simulation + Commissioner Controls on /live + Nav Fix

## THREE ISSUES TO SOLVE

### Issue 1: Commissioner trivia controls need to be on /live (War Room)

The `TriviaControlPanel` component (src/components/trivia-control-panel.tsx) is currently only rendered on the pool dashboard page (`/pools/[id]/page.tsx`). During draft night, commissioners will be on `/live` — they need trivia controls THERE.

**Fix:**
- In `src/app/live/page.tsx`: detect if the current user is a commissioner or admin for their pool
- If they are, render the `TriviaControlPanel` inside the War Room (pass it through as a prop or render it directly)
- Place it in the War Room layout ABOVE the 3-column grid, below the LivePredictionWidget and TriviaCard
- Wrap it in a collapsible section so it doesn't dominate the screen:
  - Default: collapsed, showing just a header bar "🎮 Trivia Controls" with expand button
  - Expanded: full TriviaControlPanel component
- Non-commissioners should NOT see this section at all

**Files to modify:**
- `src/app/live/page.tsx` — add commissioner detection, import TriviaControlPanel, pass poolId and settings
- May need a small wrapper component for the collapsible behavior, or just use a useState toggle inline

### Issue 2: /live link missing from navigation when draft is unlocked

In `src/components/site-nav.tsx`, the "My Draft" link points to `/live` only when `isLocked` is true:
```
{ href: isLocked ? "/live" : "/my-board", label: "My Draft" }
```

When the draft is NOT locked, there's no way to navigate to `/live` at all.

**Fix:**
- When `isLocked` is true: show "My Draft" pointing to `/live` (current behavior, keep it)
- When `isLocked` is false AND user is logged in: show BOTH links:
  - "My Draft" → `/my-board`
  - "War Room" → `/live`
- This way commissioners can always access `/live` to test trivia controls, run simulations, etc.

Actually, simpler: the `/live` page already redirects to `/dashboard` if the draft isn't locked. So instead of adding a nav link that leads to a redirect, make `/live` accessible even when unlocked but show a "Draft not live yet" state instead of redirecting.

**Better fix:**
- In `src/app/live/page.tsx`: remove the `if (!locked) redirect("/dashboard")` guard
- Instead, if `!locked`, show a pre-draft state:
  - Same War Room layout but with a banner: "The draft hasn't started yet. Use the controls below to run a simulation."
  - If the user is a commissioner/admin, show the TriviaControlPanel so they can test
  - If regular user, show "Come back when the draft is live" message
- In `site-nav.tsx`: when logged in, always include a link to `/live` labeled "War Room" (in addition to "My Draft" → `/my-board`)
  - Add "War Room" to the primaryLinks array (always visible for logged-in users)

### Issue 3: Trivia should fire during draft simulation

The draft simulation works by the admin triggering picks via `/api/admin/result` (or the ESPN sync). When a simulated pick comes in, the system should optionally advance the trivia queue — exactly like it would on draft night.

**Current state:** The `src/app/api/admin/result/route.ts` already has logic to auto-advance trivia (completes the active question and activates the next pending one) when a new pick is confirmed.

**What's needed:**
- The commissioner needs to be able to START trivia for their pool before/during simulation. Right now the queue might be loaded but nothing fires until someone hits "Fire Next."
- Add a **"Start Trivia"** button to the TriviaControlPanel that fires the first question in the queue. This is functionally the same as "Fire Next" but with different labeling when no question has been fired yet.
- Actually, "Fire Next" already does this — if no question is active, it fires the first pending one. So the REAL issue is just visibility: the commissioner needs to see these controls on `/live`.

**So the fix for Issue 3 is actually just Issue 1** — once the TriviaControlPanel is on `/live`, commissioners can:
1. Go to `/admin/trivia` → build their question queue for the pool
2. Go to `/live` (War Room) → expand trivia controls
3. Hit "Fire Next" to start the first question
4. As simulated picks come in via admin, trivia auto-advances
5. Commissioner can also manually fire, skip, or pause at any time

No new API routes needed. The infrastructure is already there.

---

## IMPLEMENTATION ORDER

1. **Nav fix** — Add "War Room" link to site-nav.tsx primaryLinks for logged-in users
2. **Remove /live redirect** — Let /live load for unlocked drafts with a pre-draft state
3. **Commissioner controls on /live** — Render TriviaControlPanel in War Room for commissioners, in a collapsible section
4. **Test flow** — Verify: commissioner can navigate to /live → expand trivia controls → fire questions → questions appear in TriviaCard → auto-advance works with simulated picks

---

## KEY RULES

- Reuse existing TriviaControlPanel — do NOT rebuild it
- Reuse existing TriviaCard component — it already polls for the current question
- The /live page should work in both locked (live draft) and unlocked (pre-draft/sim) states
- Commissioner detection: check pool member role OR site-wide admin role
- Collapsible controls: default collapsed, commissioner-only visibility
- Do NOT break the existing VideoWidget, WarRoomChat, LivePredictionWidget, or any other War Room components