# Phase 2 Week 3: Bug Fixes, Polish, and Draft Night Readiness

## Overview

Address bugs found in the Week 2 code review, harden the ESPN sync pipeline, fix BPA player matching, and polish the UI for mobile and edge cases. After this phase, the app is draft-night ready with no known issues.

**Draft night: April 23, 2026 at 8:00 PM ET**
**Time budget: ~2 weeks of buffer (shipped Week 2 on April 7)**

---

## 1. Scoring Engine Bug Fix

### Problem
`correctPlayer` in `scoring.ts` increments for ALL player matches (exact + close + far), but `correctExact` also increments for exact matches. This makes the leaderboard display "5 exact / 5 correct" when all 5 are exact — the stats overlap instead of being distinct.

### Fix
`correctPlayer` should count ONLY "right player, wrong slot" matches (close + far). Exact matches are their own category.

**File:** `src/lib/scoring.ts`

In `scoreBoard()`, change the counting logic:

```
// BEFORE (bug):
if (delta === 0) { points = 10; matchType = "exact"; correctExact++; }
else if (delta <= 5) { points = 5; matchType = "close"; }
else { points = 3; matchType = "far"; }
correctPlayer++;  // ← always increments, even for exact

// AFTER (fix):
if (delta === 0) { points = 10; matchType = "exact"; correctExact++; }
else if (delta <= 5) { points = 5; matchType = "close"; correctPlayer++; }
else { points = 3; matchType = "far"; correctPlayer++; }
// correctPlayer now only counts close + far
```

Also update `accuracyPct` calculation: it should use `(correctExact + correctPlayer) / scoredCount` to reflect total correct predictions.

---

## 2. Sync Route: Change GET to POST

### Problem
`/api/draft/sync` is a GET handler that writes to the database (upserts actual results, auto-locks draft, triggers scoring). GET requests can be cached by CDNs, prefetched by browsers, and retried by middleware — all dangerous for a write operation.

### Fix
Change the route handler from `export async function GET()` to `export async function POST()`.

**Files to update:**
- `src/app/api/draft/sync/route.ts` — change handler to POST
- `src/app/live/war-room.tsx` — update `useLiveUpdates` calls to use POST method
- `src/hooks/use-live-updates.ts` — add optional `method` field to `LiveUpdateConfig`, default `"GET"`, pass through to `fetch()`

### useLiveUpdates change

```typescript
export interface LiveUpdateConfig {
  endpoints: string[];
  interval?: number;
  enabled?: boolean;
  method?: "GET" | "POST";  // NEW — default "GET"
}
```

In `fetchAll()`:
```typescript
const res = await fetch(url, { cache: "no-store", method: config.method || "GET" });
```

---

## 3. Auth.js Session Type Extension

### Problem
Every admin route casts `(session.user as any).role` to check admin status. This is fragile — if the session shape changes, the `as any` silently hides the breakage.

### Fix
Extend Auth.js types to include `role` on the session user object.

**File:** `src/lib/auth.ts` — add to the Auth.js config:

```typescript
callbacks: {
  session({ session, user }) {
    if (session.user) {
      session.user.id = user.id;
      session.user.role = user.role;  // expose role on session
    }
    return session;
  },
},
```

**File:** `src/types/next-auth.d.ts` (new file) — type augmentation:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "user";
  }
}
```

Then replace all `(session.user as any).role` with `session.user.role` across admin routes.

---

## 4. BPA Position Alias Matching

### Problem
`seed-bpa` returned `matchedPlayers: 0`. The player matching in `bpa.ts` and `espn-api.ts` uses exact `name|position` keys. ESPN position abbreviations may not match our DB exactly (e.g., ESPN "CB" vs our "DB", ESPN "EDGE" vs our "DE", ESPN "OT" vs our "T").

### Fix
Add a position alias map and use it during matching.

**File:** `src/lib/espn-api.ts` — add:

```typescript
const POSITION_ALIASES: Record<string, string[]> = {
  "cb": ["cb", "db"],
  "db": ["db", "cb"],
  "edge": ["edge", "de", "olb"],
  "de": ["de", "edge"],
  "olb": ["olb", "edge", "lb"],
  "ot": ["ot", "t", "ol"],
  "t": ["t", "ot", "ol"],
  "og": ["og", "g", "ol"],
  "g": ["g", "og", "ol"],
  "ol": ["ol", "ot", "og", "t", "g"],
  "dt": ["dt", "dl", "nt"],
  "dl": ["dl", "dt"],
  "nt": ["nt", "dt", "dl"],
  "s": ["s", "fs", "ss", "db"],
  "fs": ["fs", "s", "db"],
  "ss": ["ss", "s", "db"],
  "ilb": ["ilb", "lb", "mlb"],
  "mlb": ["mlb", "lb", "ilb"],
  "lb": ["lb", "ilb", "mlb", "olb"],
};

export function positionMatches(espnPos: string, ourPos: string): boolean {
  const e = espnPos.toLowerCase();
  const o = ourPos.toLowerCase();
  if (e === o) return true;
  return POSITION_ALIASES[e]?.includes(o) || POSITION_ALIASES[o]?.includes(e) || false;
}
```

**File:** `src/lib/bpa.ts` — update `fetchAndStoreBpaRankings()` matching:

Instead of exact key lookup, iterate players and use `normalizePlayerName` + `positionMatches`:

```typescript
const player = ourPlayers.find(p =>
  normalizePlayerName(p.name) === normalizePlayerName(athlete.fullName) &&
  positionMatches(athlete.position, p.position)
);
```

Same change in `src/app/api/draft/sync/route.ts` for the player matching loop.

---

## 5. ESPN Sync Performance — Batch Athlete Resolution

### Problem
`fetchDraftPicks()` resolves each athlete `$ref` one at a time in a for-loop. During live draft with 32 picks, that's 32+ serial HTTP calls to ESPN, adding significant latency to each sync.

### Fix
Batch resolve athlete refs using `Promise.all` with concurrency limiting.

**File:** `src/lib/espn-api.ts`

```typescript
// Batch resolve with concurrency limit
async function batchResolveRefs(urls: string[], concurrency = 5): Promise<(any | null)[]> {
  const results: (any | null)[] = new Array(urls.length).fill(null);
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => resolveRef(url)));
    batchResults.forEach((r, j) => { results[i + j] = r; });
  }
  return results;
}
```

Use in `fetchDraftPicks`: collect all athlete `$ref` URLs first, batch resolve, then build the picks array.

---

## 6. Mobile Responsiveness Audit

### Focus areas

**War Room (`/live`):**
- 3-column layout should stack on mobile (already uses `flex-col lg:grid`)
- Verify order: on mobile, Leaderboard should show first (order-1), then Your Mock (order-2), then Actual Picks (order-3) — currently correct in code
- Test touch scrolling on the max-height overflow panels
- Ensure score badges ("+10", "+5") don't truncate on small screens

**Leaderboard (`/leaderboard`):**
- Card layout should be full-width on mobile
- Score/accuracy stats may need to wrap or stack below name on narrow screens
- Trending arrows should remain visible

**Dashboard (`/dashboard`):**
- Published mocks grid should be single column on mobile
- CTA button should be full-width on mobile

**My Board (`/my-board`):**
- Pick builder panels should stack vertically on mobile
- Drag interactions should work on touch devices (if applicable)

### Implementation
Use `lg:` breakpoint consistently (1024px). Test at 375px (iPhone SE), 390px (iPhone 14), and 768px (iPad).

---

## 7. Lock State UI Enforcement

### Problem
The spec says locked state should hide "Create Mock Draft" and show a banner, but we need to verify this is implemented across all pages.

### Checklist
- [ ] `/my-board` — pick builder read-only when locked, no new board creation
- [ ] `/dashboard` — redirects to `/live` when locked
- [ ] Home page — CTA changes from "Make Your Picks" to "Watch Live" when locked
- [ ] Nav — "My Board" link changes to "War Room" link when locked
- [ ] Banner on any page user lands on: "Mock drafts are locked — the draft is live!"

**Config check:** All pages should call `isDraftLocked()` and conditionally render.

---

## 8. Error Handling & Edge Cases

### ESPN API Failures
- If ESPN returns no data, sync should return gracefully (already does — verify)
- If ESPN is partially down (some picks but not all), sync should upsert what it can
- Add a `last_sync_status` to `app_config` ("success", "partial", "failed") for monitoring

### Scoring Edge Cases
- Board with 0 picks should get 0 score (not error)
- Board with all BPA-filled picks should score normally
- Player drafted in a trade scenario: current logic uses `teamByPick` from draft order — verify trade-up picks still match if pick numbers shift

### Race Conditions
- Two concurrent sync requests: `onConflictDoNothing` handles this — verify
- Lock-draft called twice: should be idempotent (already is via config set)

---

## 9. Temp File Cleanup & Code Hygiene

### Files to verify are deleted
- `test-espn.mjs`, `test-espn2.mjs`, `test-espn3.mjs` (cleaned up)
- `push-db.mjs` (cleaned up)
- `promote-admin.mjs` (cleaned up)
- `phase2-week2-prompt.md` in project root (check — may still exist)

### Code cleanup
- Remove any `console.log` debug statements that shouldn't be in production
- Ensure all API routes have proper error boundaries (try/catch with 500 responses)
- Verify `export const dynamic = "force-dynamic"` on all pages that need it

---

## 10. Pre-Draft Smoke Test Checklist

Run this the day before draft night (April 22):

1. **BPA Seed:** POST `/api/admin/seed-bpa` → verify `matchedPlayers > 0` (after position alias fix)
2. **Create test board:** Make a mock draft with a few picks, publish it
3. **Lock draft:** POST `/api/admin/lock-draft` → verify BPA auto-fill works
4. **Manual result:** POST `/api/admin/result` with a test pick → verify scoring triggers
5. **ESPN sync:** GET→POST `/api/draft/sync` → verify it handles "no picks yet" gracefully
6. **Leaderboard:** Verify test board appears with correct score
7. **War Room:** Navigate to `/live`, verify 3-panel layout renders with test data
8. **Unlock:** Delete `draft_locked` from `app_config`, delete test actual_results, delete test scores — reset to clean state
9. **Mobile:** Test War Room and Leaderboard on phone browser

---

## Architecture Notes

### Changed Files Summary
| File | Change |
|------|--------|
| `src/lib/scoring.ts` | Fix correctPlayer counter bug |
| `src/app/api/draft/sync/route.ts` | GET → POST, position alias matching |
| `src/hooks/use-live-updates.ts` | Add `method` config option |
| `src/app/live/war-room.tsx` | Use POST for sync endpoint |
| `src/lib/auth.ts` | Expose role in session callback |
| `src/types/next-auth.d.ts` | NEW — Auth.js type augmentation |
| `src/lib/espn-api.ts` | Position aliases, batch ref resolution |
| `src/lib/bpa.ts` | Use position alias matching |
| Various pages | Lock state UI, mobile fixes |
| Admin route files | Replace `as any` with typed role |

### New Files
| File | Purpose |
|------|---------|
| `src/types/next-auth.d.ts` | Auth.js session type extension |

### No Schema Changes
All fixes are code-level. No `drizzle-kit push` needed.
