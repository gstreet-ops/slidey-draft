# Phase 2 Week 2: ESPN API + Scoring + War Room + Leaderboard

## Overview

Wire up automated scoring via ESPN's undocumented draft API, add a live "War Room" experience for draft night, and build out the dashboard/leaderboard views. After this phase, draft night is fully automated — no admin involvement needed.

**Draft night: April 23, 2026 at 8:00 PM ET**

---

## 1. Schema Changes

### New Tables

**bpa_rankings** — ESPN prospect rankings for auto-fill
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| player_id | uuid | FK → players |
| espn_athlete_id | text | ESPN's ID for cross-reference |
| rank | integer | BPA order |
| fetched_at | timestamp | When rankings were fetched |

**pick_scores** — Per-pick scoring breakdown
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| board_id | uuid | FK → draftBoards (cascade delete) |
| pick_number | integer | 1-32 |
| points_awarded | integer | 0, 3, 5, or 10 |
| match_type | text | 'exact', 'close', 'far', 'miss' |
| actual_player_id | uuid | FK → players, nullable |
| scored_at | timestamp | |
| Unique | | (board_id, pick_number) |

**app_config** — Application-level settings
| Column | Type | Notes |
|--------|------|-------|
| key | text | PK, unique |
| value | text | |
| updated_at | timestamp | |

### Altered Tables

**actual_results** — Add column:
- `espn_athlete_id` text, nullable — ESPN's athlete ID for cross-referencing matched players

**picks** — Add column:
- `auto_filled` boolean, default false

**scores** — Replace current per-pick schema with board-level summary:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| board_id | uuid | FK → draftBoards (cascade delete), unique |
| user_id | uuid | FK → users |
| total_score | integer | Sum of all pick_scores |
| correct_exact | integer | Count of exact matches |
| correct_player | integer | Count of player-correct (any distance) |
| accuracy_pct | real | correct_player / scored_picks |
| previous_rank | integer | nullable, for trending arrows |
| updated_at | timestamp | |

The existing `scores` table is per-pick with different columns. We'll drop it and recreate since Phase 2 Week 1 scoring data is not in production use yet. The per-pick data moves to `pick_scores`.

---

## 2. ESPN API Integration

### Service: `src/lib/espn-api.ts`

Fetch layer wrapping ESPN's undocumented endpoints. All functions return typed data or null on failure (never throw).

```
fetchDraftPicks(season, round) → EspnPick[] | null
fetchDraftPick(season, round, pickNumber) → EspnPick | null
fetchDraftAthletes(season, limit?) → EspnAthlete[] | null
```

**Endpoints:**
- Picks: `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{year}/draft/rounds/{round}/picks`
- Single pick: `.../picks/{pickNumber}`
- Athletes: `.../draft/athletes?limit=100`

**Resilience:**
- 10-second timeout per request
- Return null on any error (network, parse, unexpected shape)
- Log errors with context (endpoint, status code, error message)
- Normalize player names: lowercase, strip Jr./III/II suffixes, trim whitespace

**Player matching:** Match ESPN athlete to our `players` table by normalized name + position. If no match, log a warning and skip. Store `espn_athlete_id` in `actual_results` as a dedicated text column (add to schema). A proper column is worth the one-line migration — it's queryable, indexable, and doesn't hide a key identifier inside an unrelated jsonb field.

### API Route: `/api/draft/sync` (GET)

1. Fetch all Round 1 picks from ESPN
2. For each pick, match player to our DB
3. Upsert into `actual_results`
4. Re-score all boards (call scoring engine)
5. If first result comes in and draft not locked, auto-lock
6. Return `{ newPicks: number, totalPicks: number }`

### Admin Fallback: `/api/admin/result` (POST)

Body: `{ pickNumber, playerId, teamId }`
- Requires admin session
- Inserts into `actual_results`
- Triggers re-scoring
- Used only if ESPN API fails

---

## 3. BPA Auto-Fill

### Service: `src/lib/bpa.ts`

**`fetchAndStoreBpaRankings(season)`** — Fetches ESPN athlete rankings, matches to our players, stores in `bpa_rankings` table. Run manually before draft night via an admin route or seed script.

**`autoFillBPA(boardId)`** — For a single board:
1. Get all existing picks on the board
2. Get BPA rankings ordered by rank
3. For each empty slot (pick 1-32 in order):
   - Find highest-ranked BPA player not already picked on this board
   - Insert pick with `auto_filled: true`
4. Return count of auto-filled picks

**`autoFillAllBoards(season)`** — Runs `autoFillBPA` for every board in the season. Called when draft locks.

### Admin Route: `/api/admin/seed-bpa` (POST)

Fetches and stores BPA rankings. Admin-only.

---

## 4. Scoring Engine

### Service: `src/lib/scoring.ts` (rewrite)

Replace existing scoring logic with spec-compliant version.

**`scoreBoard(boardId, actualResults)`** — Score one board:

For each pick 1-32 where an actual result exists:
- **Exact match** (same player at same pick number): **10 points**, match_type = 'exact'
- **Right player, wrong slot, within 5 picks**: **5 points**, match_type = 'close'
- **Right player, wrong slot, 6+ picks off**: **3 points**, match_type = 'far'
- **Player not drafted in Round 1**: **0 points**, match_type = 'miss'

Upsert into `pick_scores` per pick. Calculate and upsert `scores` summary row.

**`scoreAllBoards(season)`** — Fetch actual results, then `scoreBoard()` for every published/locked board. Idempotent — recalculates from scratch each time.

**Trigger:** Called by `/api/draft/sync` after upserting new picks, and by `/api/admin/result`.

---

## 5. Mock Draft Locking

### Config key: `draft_locked`

Stored in `app_config` table. Value: `"true"` or `"false"`.

### Admin Route: `/api/admin/lock-draft` (POST)

1. Set `draft_locked = "true"` in `app_config`
2. Run `autoFillAllBoards(2026)` for all boards with empty slots
3. Return confirmation with count of boards auto-filled

### Auto-lock: If `/api/draft/sync` finds results and `draft_locked` is not `"true"`, lock automatically (run BPA fill + set config).

### UI impact when locked:
- Pick builder becomes read-only
- "Create Mock Draft" button hidden
- Banner: "Mock drafts are locked — the draft is live!"
- `/dashboard` redirects to `/live`

---

## 6. Dashboard (`/dashboard`)

Default logged-in home page. Pre-draft view.

- All published mock drafts in a comparison grid
- Dan's column pinned left with Lions theming
- User's own mock(s) highlighted
- Summary bar: total published mocks, your mock status, days until draft
- "Create Your Mock Draft" CTA if user hasn't made one
- If `draft_locked`, redirect to `/live`

---

## 7. War Room (`/live`)

Single-page draft night experience. Three-panel layout.

### Left Panel — Actual Picks Feed
- Real picks as they arrive from ESPN
- Each entry: pick #, team logo, player name, position, school
- New picks appear at top with subtle entrance animation

### Center Panel — Your Mock vs Actual
- Two-column: prediction vs actual per slot
- Color-coded by score: Green (10), Yellow (5), Orange (3), Red (0), Gray (pending)
- Auto-filled BPA picks shown italic + "BPA" badge
- Running score total at top

### Right Panel — Live Leaderboard
- Ranked by total score
- Each row: rank, username, score, accuracy %, trending arrow
- Dan's row highlighted (Lions theming)
- Logged-in user's row highlighted
- Progress: "X of 32 picks in"

### Live Updates via `useLiveUpdates()` Hook

Abstract polling behind a transport-agnostic hook:

```typescript
interface LiveUpdateConfig {
  endpoints: string[];
  interval: number; // ms, default 30000
  enabled: boolean;
}

function useLiveUpdates<T>(config: LiveUpdateConfig): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}
```

Current implementation: polling via `setInterval` + `fetch`. The hook interface is designed so the internals can be swapped to SSE or WebSocket later without changing any consumer components.

Configurable polling interval (default 30s).

---

## 8. Leaderboard (`/leaderboard`)

Standalone page — works both during and after draft.

- Full-width table: rank, username, board name, total score, exact matches, accuracy %, trending arrow
- Dan's row highlighted with Lions theming
- Click row to expand pick-by-pick breakdown (inline or navigate to scoring breakdown view)
- Group leaderboard on `/group/[id]` filtered to group members

### API Route: `/api/leaderboard` (GET)

Query param: `?season=2026&groupId=optional`
Returns ranked array of scores with user info. Used by both War Room and standalone leaderboard.

---

## 9. Scoring Breakdown View

When clicking any board from leaderboard or War Room:
- 32-pick board with scoring annotations per slot
- Green/Yellow/Orange/Red/Gray highlights
- User's predicted player AND actual player side by side
- BPA badge on auto-filled picks
- Total score at top

Route: `/picks/[boardId]` enhanced with scoring overlay when actual results exist, or a new `/scores/[boardId]` route.

**Decision:** Enhance existing `/picks/[boardId]` — it already shows the board; we add a scoring layer when actual results are available. Avoids route duplication.

---

## Architecture Notes

### New API Routes Summary
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/draft/sync` | GET | None (called by polling) | Fetch ESPN picks, upsert results, re-score |
| `/api/leaderboard` | GET | None | Leaderboard data (optional groupId filter) |
| `/api/admin/result` | POST | Admin | Manual result entry fallback |
| `/api/admin/lock-draft` | POST | Admin | Lock drafts + BPA fill |
| `/api/admin/seed-bpa` | POST | Admin | Fetch/store ESPN BPA rankings |

### New Lib Files
| File | Purpose |
|------|---------|
| `src/lib/espn-api.ts` | ESPN fetch layer |
| `src/lib/bpa.ts` | BPA ranking + auto-fill logic |
| `src/lib/scoring.ts` | Rewritten scoring engine |
| `src/lib/config.ts` | App config helpers (get/set from app_config table) |
| `src/hooks/use-live-updates.ts` | Transport-agnostic live data hook |

### File Changes
| File | Change |
|------|--------|
| `src/db/schema.ts` | Add bpa_rankings, pick_scores, app_config; alter picks, scores |
| `src/lib/queries.ts` | Add leaderboard, config, scoring queries |
| `src/lib/actions.ts` | Add lock-draft action |
| Various pages | Dashboard, War Room, enhanced leaderboard, scoring overlays |
