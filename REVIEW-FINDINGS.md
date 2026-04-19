# Slidey Draft — Pre-Launch Code Review Findings

**Review date:** 2026-04-19 · **Draft night:** 2026-04-23
**Scope:** all master-branch changes from the last ~1 week.
**Method:** 4 parallel read-only review agents (security/auth, performance/data, edge-cases/UX, dead-code/consistency).

---

## Executive Summary

| Category | CRITICAL | IMPORTANT | MINOR |
|---|---|---|---|
| Security + Auth | 3 | 7 | 12* |
| Performance + Data | 4 | 6 | 3 |
| Edge Cases + UX | 2 | 7 | 6 |
| Dead Code + Consistency | 0 | 5 | 11 |
| **Total** | **9** | **25** | **32** |

*Several security MINORs are positive confirmations ("verified clean"), not issues.

### Top CRITICAL ship-blockers

1. **Pre-seeded friends cannot sign in with Google** — `OAuthAccountNotLinked` thrown on first sign-in (edge-case C1).
2. **`/api/draft/sync` has zero auth** — anyone can lock the real draft and auto-fill every board (security C1).
3. **`simulateNextPick` / `resetSimulation` server actions have no auth** — any user can wipe `actual_results` for season 2026 (security C2).
4. **`/api/pools/[poolId]/auto-fill` skips membership check** — non-members can write `live_predictions` into any pool (security C3).
5. **N+1 query explosion on `/mock-drafts`** — ~42 sequential queries per page load (perf C1+C2).
6. **LandingPage loops all published boards serially** — ~100 sequential queries on cold home load (perf C3).
7. **Missing indexes on `draft_boards` and `trades`** hot columns (perf C4).
8. **`setEntryBoard` is non-atomic** — can leave user with zero or two entry boards (edge-case C2).
9. **No `loading.tsx` or error boundary on `/mock-drafts`** — server-action errors white-screen the page (edge-case C3).

---

## SECURITY + AUTH

### CRITICAL

#### S-C1. Unauthenticated `/api/draft/sync` can lock the real draft and auto-fill every board
- **Location:** `src/app/api/draft/sync/route.ts:15-128`
- **Evidence:** `POST` handler has no `auth()`, no secret header, no role check. Runs `draft_locked=true`, `autoFillAllBoards(SEASON)`, `scoreAllBoards`, `recalculateAllPools`, inserts `actualResults`.
- **Impact:** Any anonymous caller can freeze every friend's entry board before draft night, auto-fill everyone's drafts with BPA picks, and push fake ESPN results.
- **Fix:** Require `auth()` + `role === "admin"` **or** constant-time `SYNC_SECRET` header compare (mirror `/api/sync-draft-order`). Block GET entirely.

#### S-C2. `simulateNextPick` and `resetSimulation` server actions have no auth check
- **Location:** `src/app/admin/simulate/actions.ts:224` and `:346`
- **Evidence:** Both exported from a `"use server"` file with no `auth()` guard. Server actions are HTTP-addressable. `resetSimulation` runs `db.delete(actualResults).where(eq(actualResults.season, 2026))` — not scoped to sim-only rows.
- **Impact:** Any authenticated user can wipe the entire live 2026 `actual_results` table, or inject spoof picks.
- **Fix:** Add admin session check at the top. Narrow `resetSimulation` delete to sim-created results (match by `created_by` on board).

#### S-C3. `/api/pools/[poolId]/auto-fill` accepts arbitrary `poolId` without membership check
- **Location:** `src/app/api/pools/[poolId]/auto-fill/route.ts:7-57`
- **Evidence:** Auth check requires `session.user.id` only; no verification the caller belongs to `poolId`. Inserts `livePredictions` row.
- **Impact:** Authenticated non-members can contaminate any pool's live-predictions / leaderboard.
- **Fix:** `if (!(await isPoolMember(poolId, session.user.id))) return 403`.

### IMPORTANT

- **S-I1.** `SYNC_SECRET` uses non-constant-time `!==` and reads from `?secret=` query string (which Vercel logs). `src/app/api/sync-draft-order/route.ts:17-18`. Fix with `crypto.timingSafeEqual` and drop query-string fallback.
- **S-I2.** `/api/board/[boardId]/live` and `/api/draft/results` have no auth. Board-live can leak unpublished picks to anyone who guesses a board UUID. `src/app/api/board/[boardId]/live/route.ts:8`.
- **S-I3.** `/api/pools/[poolId]/leaderboard` has no `isPoolMember` gate. `src/app/api/pools/[poolId]/leaderboard/route.ts:7-39`.
- **S-I4.** `/api/draft/pick-context` has no auth and falls back to raw email for display names when `name` is null. `src/app/api/draft/pick-context/route.ts:6-61`.
- **S-I5.** Google OAuth provider lacks `allowDangerousEmailAccountLinking` safety semantics — see **edge-case C1** for the immediate launch blocker this causes. Recommended follow-up: verify Google's `email_verified` flag in the `signIn` callback before linking. `src/lib/auth.ts:24-29`.
- **S-I6.** Anthropic API key prefix logged on errors (`keyPrefix: API_KEY.substring(0, 10)`). `src/app/api/admin/trivia/generate/route.ts:68-69`. Drop the prefix field.
- **S-I7.** `recordManualTrade` / `revertTrade` let any `commissioner` rewrite the site-wide (cross-pool) draft order. `src/lib/actions.ts:1373-1443`. Consider restricting to sitewide admins.

### MINOR

- **S-M1.** `AdminLayout` relies on each admin page to re-check the role. Every existing admin page does, but future pages could forget. Introduce a `requireAdmin()` helper.
- **S-M2.** `updatePickAnalysis` is ownership-only (no admin override), inconsistent with `makePick`/`removePick`/`publishBoard`.
- **S-M7.** `/api/pools/[poolId]/trivia/answer` and `/respond` don't verify pool membership.
- **Positive confirmations (S-M3 through S-M12):** `setEntryBoard` ownership ✓, `createAdditionalUserBoard` active-user ✓, mock-drafts page ownership check ✓, `forceSyncDraftOrder` admin-gated ✓, `.env*` not committed ✓, no hardcoded API keys ✓, no `NEXT_PUBLIC_*` leakage ✓, `SYNC_SECRET` refuses when unset ✓.

---

## PERFORMANCE + DATA

### GOOD NEWS (verified clean)
- **No AI calls on page load.** `gradeMockDraft` and `generatePickCommentary` are pure deterministic template/math functions. Only Anthropic callsite is admin-gated trivia generator. **Zero Anthropic billing risk on hot paths.**
- Trade indicator uses pre-built `tradesByPick` map with O(1) lookup — no per-pick trade query.
- `scoreMockDraft` already batches `actualPlayerPositions` via `inArray`.

### CRITICAL

#### P-C1. N+1 explosion on `/mock-drafts` pool-member fan-out (~42 queries)
- **Location:** `src/lib/mock-drafts-data.ts:33-70` + `src/lib/queries.ts:465-493`
- **Evidence:** `getPoolMembersWithStatus` fires 2 queries per member. `getPoolMemberDrafts` then loops members AGAIN firing 4 more queries per member (board + `getBoardWithPicks`).
- **Impact:** 7 members × 6 queries = **42 sequential queries**, plus ~3 top-level + ~2-4 for user boards loop. Cold load latency 1.5-3s.
- **Fix:** Replace with a 3-query batched pipeline: `(members) → boards via inArray(createdBy, memberIds) → picks via inArray(boardId, boardIds)`. Drops to ~3 queries total.

#### P-C2. `getPoolMembersWithStatus` does work the caller never uses
- **Location:** `src/lib/queries.ts:465-493` via `src/lib/mock-drafts-data.ts:17`
- **Evidence:** Per-member board summary + `COUNT(*)` is re-fetched via `getBoardWithPicks` in the next step. `pickCount` silently thrown away.
- **Impact:** ~14 wasted queries per `/mock-drafts` render.
- **Fix:** Rolls into P-C1's batched pipeline, or split helper into lean/enriched variants.

#### P-C3. LandingPage (unauth home) loops every published board serially
- **Location:** `src/app/page.tsx:292-310`
- **Evidence:** `for (const b of published) { await getBoardWithPicks(b.id) }` — no `Promise.all`. Each board = 2 queries.
- **Impact:** Up to ~100 serial queries on every unauth home hit. Draft-night spectator traffic will hammer this.
- **Fix:** Short-term: wrap in `Promise.all(...)`. Long-term: precompute grades at publish time, batch-fetch picks with `inArray`.

#### P-C4. Missing indexes on hot filter columns
- **Location:** `src/db/schema.ts:142-155` (draftBoards), `:181-195` (trades)
- **Evidence:** `draft_boards` has ZERO secondary indexes. Every mock-drafts render filters `(createdBy, season, isEntryDraft)` unindexed. `trades` has no `(season, detectedAt)` index.
- **Fix:** Add `draft_boards_creator_season_entry_idx`, `draft_boards_season_status_idx`, `trades_season_detected_idx`, `trades_season_pick_idx`. Ship as drizzle migration.

### IMPORTANT

- **P-I5.** Same N+1 pattern on `/picks/page.tsx` (~21 queries). `src/app/picks/page.tsx:68-106`. `latestNoteRow` query is redundant with `data.picks.analysis`.
- **P-I6.** Home dashboard `publishedBoardsInPool` counts ALL users' published boards globally, not pool-scoped. Data bug + full scan. `src/app/page.tsx:109-119`.
- **P-I7.** `getPlayers()` full-table fetch (300 rows × ~20 cols, ~100-300KB) on every board + home + live + props + big-board. `src/lib/queries.ts:41-46`.
- **P-I8.** `scoreLivePredictions` walks every pool on every actual result (~35 queries per real pick → ~1100 over the draft). `src/lib/pool-scoring.ts:163-219`.
- **P-I9.** `recalculatePoolStandings` per-member upsert-by-select (~42 queries per pool recalc, serial). `src/lib/pool-scoring.ts:275-384`. Swap to `onConflictDoUpdate`.
- **P-I10.** `getTrades` inner-joins teams + sorts on unindexed column. Covered by P-C4 index.

### MINOR

- **P-11.** Unbounded `SELECT`s without `LIMIT` on `getTeams`/`getAllPools`/`getPlayers`/`/api/draft/sync`. Bounded today by nature.
- **P-12.** `getLeaderboard` fetches then filters in JS. `src/lib/queries.ts:272-328`.
- **P-13.** No index on `players(rank)` despite being primary sort column.

---

## EDGE CASES + UX

### CRITICAL

#### E-C1. Pre-seeded friends CANNOT sign in with Google — `OAuthAccountNotLinked` thrown
- **Location:** `src/lib/auth.ts:24-29` (Google provider config)
- **Evidence:** Verified against `@auth/core` source. Pre-seed creates a `users` row by email with NO linked `accounts` row. Auth.js v5 rejects OAuth sign-in when a user-by-email exists without a linked account **unless** `allowDangerousEmailAccountLinking: true`. That flag is NOT set.
- **Impact:** Every friend the admin pre-seeded will hit an auth error on first sign-in. **Launch-blocking.**
- **Fix:** One-line — add `allowDangerousEmailAccountLinking: true` to Google provider. Google verifies email ownership, making this reasonably safe.

#### E-C2. `setEntryBoard` is non-atomic
- **Location:** `src/lib/actions.ts:130-164`
- **Evidence:** Two separate UPDATEs on Neon HTTP (no transactions). No partial unique index enforces one entry per user. Concurrent tabs can leave two entry boards; a mid-failure leaves zero.
- **Fix:** Fold into a single CTE `db.execute(sql`...`)` (pattern from `joinPool` at `:557-570`). Add partial unique index `(created_by, season) WHERE is_entry_draft`.

#### E-C3. No `loading.tsx` anywhere + `/mock-drafts` has no error boundary; server actions throw raw errors
- **Location:** Confirmed via glob (0 `loading.tsx` files). `src/app/mock-drafts/` has no `error.tsx`. `src/components/my-drafts-section.tsx:48-64` calls `setEntryBoard` / `createAdditionalUserBoard` in `startTransition` with no try/catch.
- **Impact:** Slow mobile connection = blank page or stale previous page during navigation. DB hiccup during "Set as Entry" / "+ Create New Draft" = white-screen.
- **Fix:** Add `src/app/mock-drafts/loading.tsx` and `src/app/mock-drafts/error.tsx`. Wrap action calls in try/catch → `setErr(msg)` in `MyDraftsSection` (same pattern as `admin-draft-order.tsx:101-117`).

### IMPORTANT

- **E-I4.** ✅ RESOLVED — Stale `/my-board` links in guide and home fixed alongside D-I1..D-I4.
- **E-I6.** `/admin` page renders "Create Your Own Pool" section for any signed-in non-admin. Confusing but gated properly below.
- **E-I7.** Home CTA labels say "Edit & browse the pool →" for users without a pool.
- **E-I8.** Home page re-computes countdown twice with slightly different code paths.
- **E-I9.** Server actions throw raw `Error` — generic error overlay/white-screen.
- **E-I10.** `admin-draft-order` shares one `useTransition` between Record Trade and Sync Now.

### MINOR

- **E-11.** No cap on `createAdditionalUserBoard`.
- **E-12.** `admin-draft-order` manual trade form looks chunky on 375px (no overflow).
- **E-13.** `/dashboard` forces `/onboarding/team` redirect but `/mock-drafts` doesn't.
- **E-14.** Fresh sign-in bypasses team picker for users with no invite link.
- **E-15.** Cosmetic: `InviteCodeInput` placeholder alignment.
- **E-16.** `/dashboard` horizontal scroll `minWidth` grows to ~9000px at 32 boards.

### VERIFIED SAFE (initially suspected, confirmed fine)
- `gradeMockDraft` handles empty pick arrays.
- `getBoardWithPicks` returns null safely.
- No-pool home dashboard guards with `{inPool && ...}`.
- `/my-board` redirect is clean.
- `admin-draft-order` form at 375px — grid stacks to one column.

---

## DEAD CODE + CONSISTENCY

### CRITICAL
_None._

### IMPORTANT (all stale `/my-board` / "My Draft" references from the rename)

- **D-I1.** ✅ RESOLVED — Home page primary CTA now `href="/mock-drafts"`. `src/app/page.tsx:337`.
- **D-I2.** ✅ RESOLVED — "Top Prospects → View All" href now `/big-board`. `src/app/page.tsx:479`.
- **D-I3.** ✅ RESOLVED — Guide page primary CTA now `href="/mock-drafts"`, label "Go to Mock Drafts". `src/app/guide/page.tsx:561-562`.
- **D-I4.** ✅ RESOLVED — Guide body copy updated in all 3 places. `src/app/guide/page.tsx:161, 289, 443`.
- **D-I5.** ✅ RESOLVED — Admin invite-friends copy now says "Mock Drafts". `src/app/admin/page.tsx:291`.

### MINOR

- **D-M1.** `is_entry_draft` backfill is correct but there's no partial unique index. See **edge-case C2** for the combined fix.
- **D-M2.** ✅ RESOLVED — Deleted `src/app/my-board/error.tsx` (redirect-only page can't error).
- **D-M3.** ✅ RESOLVED — `src/db/seed-friends.ts:15` comment now points to `/mock-drafts`.
- **D-M4.** ✅ RESOLVED — `src/app/dashboard/page.tsx:4` comment now points to `/mock-drafts`.
- **D-M5.** Orphan components: `home-nav.tsx`, `mobile-nav.tsx`, `war-room-chat.tsx` (zero importers). Note: `war-room-chat.tsx` may be a half-wired feature (see `war-room-chat-panel-prompt.md` at repo root).
- **D-M6.** Orphan lib: `src/lib/prop-resolver.ts` (entire module unused).
- **D-M7.** Empty directories `src/components/layout/` and `src/components/ui/`.
- **D-M8.** Two feature-toggle patterns coexist (`isFeatureEnabled(...)` vs direct `settings.X`). Several gating sites should use the canonical helper. `pool-scoring.ts:37` gates off `settings.mockDraftBonus` while feature key is `mockDraft` — implicit coupling.
- **D-M9.** `any` in form error handlers: `src/app/pools/create/page.tsx:51`, `scripts/stress-test-concurrent.ts:35`.
- **D-M10.** `as any` + `@ts-ignore` in `scripts/check-data-integrity.ts` (6 sites).
- **D-M11.** `as unknown as Record<string, unknown>` in `collapsible-scoring-settings.tsx:40` and `collapsible-video-settings.tsx:21`.

---

## Fix Plan

**This commit addresses all 9 CRITICAL findings.** IMPORTANT and MINOR findings are documented above and left for follow-up per review instructions.
