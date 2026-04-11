# Draft Night Stress Prep Report

**Date:** 2026-04-11
**Draft Night:** April 23, 2026

---

## 1. ESPN API Resilience

### Checked
- `src/lib/espn-api.ts` — try/catch with timeout on every fetch, graceful null returns
- `src/hooks/use-live-updates.ts` — polling interval (30s default)
- Position alias map coverage
- Malformed response handling

### Issues Found & Fixed
- **Missing position aliases** — Added: `IOL`, `C`, `FB`, `LS`, `P`, `K`, `WR`, `TE`, `QB` to `POSITION_ALIASES` in `src/lib/espn-api.ts`
- **No exponential backoff** — Rewrote `useLiveUpdates` polling from fixed `setInterval` to `setTimeout` chain with backoff: on failure, interval doubles (2x, 4x, capped at 4x base), resets on success. `src/hooks/use-live-updates.ts`
- **Minimal logging on sync** — Added timestamped console.log for each poll result (new picks count, ESPN total, recalc status) in `src/app/api/draft/sync/route.ts`

### Test Script Results
- `src/scripts/test-espn-resilience.ts` — ESPN endpoint reachable (200), 7 rounds returned for 2026 season
- Round 1 items available but no picks made yet (expected — draft is April 23)
- Malformed response simulation: all 4 edge cases passed (null picks, empty array, missing athlete, missing status)

---

## 2. Pool Standings Recalculation

### Checked
- `src/lib/pool-scoring.ts` — recalculatePoolStandings(), scoreMockDraft(), getTriviaScores()
- `src/app/api/draft/sync/route.ts` — what triggers recalc on new picks
- Combined score formula
- Trivia point tiers
- Edge cases (0 members, no mock draft, ties)

### Issues Found & Fixed
- **CRITICAL: Standings not recalculated on new picks** — `sync/route.ts` called `scoreAllBoards()` but NOT `recalculateAllPools()`. Added import and call to `recalculateAllPools()` after `scoreAllBoards()` so pool standings (mock + live + trivia) update on every new pick.
- **No tiebreaker sort** — Standings sorted only by `combinedScore`. Added secondary sort by `correctPredictions` descending in `src/lib/pool-scoring.ts`.

### Verified OK
- Combined score formula: `mockBonus + liveTotal + triviaTotal = combinedScore` ✓
- Trivia tiers: easy=3, medium=5, hard=10 ✓ (in `src/lib/pool-helpers.ts` DEFAULT_POOL_SETTINGS)
- 0 members = empty loop, no error ✓
- No mock draft = mockBonus stays 0 (reduce on empty array) ✓

---

## 3. Chat Polling Performance

### Checked
- `src/components/pool-chat.tsx` — polling logic, dedup, spectator handling
- `src/app/api/pools/[poolId]/chat/route.ts` — message validation, auth
- `src/lib/queries.ts` — getPoolChatMessages query

### Verified OK — No Changes Needed
- Polls at 5s intervals ✓
- Uses `?after=timestamp` cursor — only fetches new messages ✓
- 50 message limit per query ✓ (queries.ts:456)
- Deduplication via Set of message IDs ✓ (pool-chat.tsx:58-59)
- Failed polls: empty catch, no retry stacking ✓
- Spectators: backend checks `user.status !== "active"` returns 403; frontend hides input ✓

---

## 4. Concurrent User Simulation

### Test Script
- `src/scripts/stress-test-concurrent.ts` — fires 15 concurrent requests to 3 endpoints
- Could not run against live server (dev server not running in CLI context)
- **Manual verification needed:** Run `npx tsx src/scripts/stress-test-concurrent.ts` with dev server running

---

## 5. Trivia Window Edge Cases

### Checked
- `src/components/trivia-card.tsx` — timer, timeout, question flow
- `src/app/api/pools/[poolId]/trivia/route.ts` — question fetching
- `src/app/api/pools/[poolId]/trivia/answer/route.ts` — answer scoring

### Issues Found & Fixed
- **Timeout doesn't record to DB** — When trivia timer expires, the timeout handler only set local state but never submitted to the server. This meant the question could be re-asked on next fetch. Fixed: `handleTimeout` now POSTs `selectedOption: "__timeout__"` to the answer endpoint, marking the question as answered with 0 points. `src/components/trivia-card.tsx`

### Verified OK
- Back-to-back picks: Trivia is user-initiated (click "Start Trivia"), not auto-triggered by picks. No stacking issue.
- Questions exhausted: Server returns `{ noMoreQuestions: true }`, component shows "All trivia complete!" state ✓
- Difficulty tier scoring: Uses `getEffectiveScoring()` which reads pool settings with tiered values ✓
- Unanswered trivia: Now properly scores 0 and records to DB ✓

---

## 6. Data Integrity Checks

### Test Script
- `src/scripts/check-data-integrity.ts` — checks counts, orphans, settings validation, unique invite codes, duplicate memberships
- Could not run against Neon DB (connection refused from CLI environment — this is a known Neon serverless driver limitation outside Next.js runtime)
- **Manual verification needed:** Run through Vercel deployment or `next dev` environment

---

## 7. Error Boundaries

### Issues Found & Fixed
- **No error.tsx files existed anywhere** in the app. Added Next.js error boundaries for:
  - `src/app/pools/[id]/error.tsx` — Pool dashboard
  - `src/app/pools/[id]/leaderboard/error.tsx` — Leaderboard
  - `src/app/live/error.tsx` — Live draft view

All show a friendly "Something went wrong" message with a "Try Again" button that calls `reset()`.

Note: Chat and trivia are client components embedded in pool pages — they're covered by the pool dashboard error boundary. Individual component-level try/catch already exists in their fetch calls.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/espn-api.ts` | Added 9 position alias entries (IOL, C, FB, LS, P, K, WR, TE, QB) |
| `src/hooks/use-live-updates.ts` | Replaced setInterval with setTimeout + exponential backoff |
| `src/app/api/draft/sync/route.ts` | Added `recalculateAllPools()` call + timestamped logging |
| `src/lib/pool-scoring.ts` | Added tiebreaker sort (correctPredictions) |
| `src/components/trivia-card.tsx` | Timeout now submits to server to prevent question re-asking |
| `src/app/pools/[id]/error.tsx` | NEW — Error boundary for pool dashboard |
| `src/app/pools/[id]/leaderboard/error.tsx` | NEW — Error boundary for leaderboard |
| `src/app/live/error.tsx` | NEW — Error boundary for live draft view |
| `src/scripts/test-espn-resilience.ts` | NEW — ESPN API diagnostic script |
| `src/scripts/stress-test-concurrent.ts` | NEW — Concurrent load test script |
| `src/scripts/check-data-integrity.ts` | NEW — Database integrity check script |

---

## Manual Verification Needed Before Draft Night

1. **Run data integrity check** from Vercel or dev server: `npx tsx src/scripts/check-data-integrity.ts`
2. **Run concurrent stress test** with dev server running: `npx tsx src/scripts/stress-test-concurrent.ts`
3. **Test trivia timeout** in browser — let timer expire, verify question doesn't repeat
4. **Verify leaderboard updates** after simulated pick — confirm standings recalculate

---

## Draft Night Readiness Assessment

### YELLOW

**Rationale:** All critical code paths have been hardened — the biggest fix was adding `recalculateAllPools()` to the sync route, which would have caused standings to NOT update during the live draft. Exponential backoff, error boundaries, and trivia timeout fix are all solid improvements. However, the data integrity check and concurrent load test couldn't run against the live database from this environment and need manual verification before April 23.
