# Draft Night Stress Prep Report

**Date:** 2026-04-11  
**Draft Night:** April 23, 2026 (12 days away)

## 1. ESPN API Resilience

**Files:** `src/lib/espn-api.ts`, `src/app/api/draft/sync/route.ts`

| Check | Status |
|-------|--------|
| try/catch around every ESPN fetch | PASS — `espnFetch()` wraps all calls with try/catch, returns null on failure |
| 10-second timeout per request | PASS — AbortController with 10s timeout |
| Rate limiting (10s between syncs) | PASS — `RATE_LIMIT_MS = 10_000` with cached response on rate limit hit |
| Logging on success/failure | PASS — timestamps and pick counts logged |
| Position alias map completeness | PASS — covers CB, DB, EDGE, DE, OLB, OT, T, OG, G, OL, DT, DL, NT, S, FS, SS, ILB, MLB, LB, IOL, C, FB, RB, LS, P, K, WR, TE, QB |
| Malformed response handling | PASS — null checks on `data?.items`, `roundData?.picks`, skips picks without athlete/pickNumber |
| Batch reference resolution | PASS — 5-concurrent batch with individual error handling |

**Note:** Exponential backoff is the caller's responsibility (admin panel or cron). The sync endpoint handles failures gracefully by returning error status and logging.

## 2. Pool Standings Recalculation

**File:** `src/lib/pool-scoring.ts`

| Check | Status |
|-------|--------|
| Recalculates on every new pick | PASS — `recalculateAllPools()` called after every sync |
| Three-track formula | PASS — `combinedScore = mockBonus + liveTotal + triviaTotal` |
| Tiered trivia scoring | PASS — `getEffectiveScoring()` reads pool settings for difficulty tiers |
| Standard/Custom mode enforcement | PASS — standard mode uses hardcoded defaults regardless of settings |
| 0 members/predictions safe | PASS — empty arrays handled, no division by zero |
| No mock draft = 0 bonus | PASS — `mockScoreRows.reduce()` starts at 0, empty array = 0 |
| Tiebreaker | PASS — sorts by `combinedScore` desc, then `correctPredictions` desc |

## 3. Chat Polling Performance

**Files:** `src/components/pool-chat.tsx`, `src/app/api/pools/[poolId]/chat/route.ts`

| Check | Status |
|-------|--------|
| 5-second poll interval | PASS — `setInterval(fetchMessages, 5000)` |
| Incremental fetching | PASS — uses `after` timestamp param, only fetches newer messages |
| Message limit per poll | PASS — `.limit(50)` on DB query |
| Deduplication | PASS — client-side ID set check before appending |
| Failed polls don't stack | PASS — empty catch block, no retry on error |
| Spectator read-only | PASS — server-side `user.status !== "active"` check + client UI hides input |

## 4. Trivia Edge Cases

**Files:** `src/components/trivia-card.tsx`, `src/app/api/pools/[poolId]/trivia/answer/route.ts`

| Check | Status |
|-------|--------|
| Back-to-back picks | OK — trivia is user-initiated ("Start Trivia" button), not auto-triggered |
| Questions run out | PASS — `noMoreQuestions: true` response shows "All trivia complete!" UI |
| Difficulty-based scoring | PASS — API reads `question.difficulty`, looks up tier value from pool settings |
| Timeout scores 0 | PASS — `handleTimeout()` submits `__timeout__` and server returns 0 points |
| Timer cleanup | PASS — `clearInterval` on unmount and on answer submission |

**Fixed:** Updated trivia card subtitle from "5pts each" to "3-10pts by difficulty"

## 5. Error Boundaries

| Route | Error Boundary | Status |
|-------|---------------|--------|
| `/live` | `src/app/live/error.tsx` | EXISTS |
| `/pools/[id]` | `src/app/pools/[id]/error.tsx` | EXISTS |
| `/pools/[id]/leaderboard` | `src/app/pools/[id]/leaderboard/error.tsx` | EXISTS |
| `/my-board` | `src/app/my-board/error.tsx` | ADDED |
| `/scoring` | `src/app/scoring/error.tsx` | ADDED |

All error boundaries show "Something went wrong" with a "Try Again" button.

## 6. Data Integrity Check Results

```
Users:            7
Pools:            2
Pool Members:     7
Mock Drafts:      5
Live Predictions: 132
Trivia Questions: 50
Trivia Responses: 0
Chat Messages:    0
App Invites:      5 (unclaimed)
Pool Standings:   6

Orphaned predictions:  0
Orphaned chat:         0
Orphaned trivia:       0
Pool settings:         ALL VALID (scoringMode + triviaPointValues present)
Invite code uniqueness: ALL UNIQUE
Duplicate memberships: NONE
```

**STATUS: ALL CLEAR**

## 7. Manual Verification Needed

- [ ] Browser test: Open /live in two tabs — verify both update
- [ ] Browser test: Submit trivia answer as timer hits 0 — no double submission
- [ ] Browser test: Chat message appears in another browser within 5 seconds
- [ ] Network test: Disable WiFi during a chat poll — verify recovery
- [ ] Test with 10+ real users on draft night

## Overall Draft Night Readiness: GREEN

All critical paths have error handling, graceful fallbacks, and data integrity checks pass. Scoring engine correctly uses all three tracks with tiered trivia and Standard/Custom mode. Chat and trivia handle edge cases. Error boundaries prevent white screens on all draft-night routes.
