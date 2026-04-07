# Phase 2 Week 2: ESPN API + Scoring + War Room + Leaderboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up automated ESPN draft scoring, BPA auto-fill, live War Room, and leaderboard so draft night is fully automated.

**Architecture:** Schema-first approach — add new tables and alter existing ones, then build the service layer (ESPN API, BPA, scoring, config), then API routes, then UI pages (dashboard, war room, leaderboard, scoring breakdown). All live data flows through a transport-agnostic `useLiveUpdates()` hook.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon PostgreSQL, Tailwind CSS v4, TypeScript

**Shell note:** This project runs on Windows PowerShell. Use `;` to chain commands, never `&&`.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/db/schema.ts` | (modify) Add bpaRankings, pickScores, appConfig tables; alter actualResults, picks, scores |
| `src/lib/espn-api.ts` | ESPN API fetch layer — all external calls |
| `src/lib/bpa.ts` | BPA ranking storage + auto-fill logic |
| `src/lib/scoring.ts` | (rewrite) Scoring engine — scoreBoard, scoreAllBoards |
| `src/lib/config.ts` | App config helpers — getConfig, setConfig |
| `src/hooks/use-live-updates.ts` | Transport-agnostic polling hook |
| `src/app/api/draft/sync/route.ts` | ESPN sync endpoint |
| `src/app/api/leaderboard/route.ts` | Leaderboard data endpoint |
| `src/app/api/admin/result/route.ts` | Manual result entry fallback |
| `src/app/api/admin/lock-draft/route.ts` | Lock drafts + BPA fill |
| `src/app/api/admin/seed-bpa/route.ts` | Fetch/store BPA rankings |
| `src/app/dashboard/page.tsx` | Pre-draft comparison dashboard |
| `src/app/live/page.tsx` | War Room server component shell |
| `src/app/live/war-room.tsx` | War Room client component (3-panel) |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/queries.ts` | Add config, leaderboard (new), pick_scores queries |
| `src/lib/actions.ts` | Update scoring call signature, add lock-draft action |
| `src/app/picks/[boardId]/page.tsx` | Add scoring overlay |
| `src/app/my-board/page.tsx` | Add draft-locked banner + read-only mode |
| `src/app/leaderboard/page.tsx` | Rewrite to use new scores table + trending + expand |
| `src/app/page.tsx` | Add nav links (Dashboard, Live, Leaderboard) |
| `src/app/group/[id]/page.tsx` | Add group leaderboard section |

---

## Task 1: Schema Changes

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add new tables and alter existing tables in schema.ts**

Add these imports at the top if not already present — `real` from `drizzle-orm/pg-core`:

```typescript
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  primaryKey,
  real,
} from "drizzle-orm/pg-core";
```

Add `espnAthleteId` to `actualResults`:

```typescript
// In actualResults table definition, after announcedAt:
    espnAthleteId: text("espn_athlete_id"),
```

Add `autoFilled` to `picks`:

```typescript
// In picks table definition, after confidence:
    autoFilled: boolean("auto_filled").default(false),
```

Replace the entire `scores` table with:

```typescript
// ── Scores (board-level summary) ──────────────────
export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => draftBoards.id, { onDelete: "cascade" })
    .unique(),
  userId: uuid("user_id").references(() => users.id),
  totalScore: integer("total_score").notNull().default(0),
  correctExact: integer("correct_exact").notNull().default(0),
  correctPlayer: integer("correct_player").notNull().default(0),
  accuracyPct: real("accuracy_pct").default(0),
  previousRank: integer("previous_rank"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Add new tables after the scores table:

```typescript
// ── Pick Scores (per-pick scoring breakdown) ──────
export const pickScores = pgTable(
  "pick_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => draftBoards.id, { onDelete: "cascade" }),
    pickNumber: integer("pick_number").notNull(),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    matchType: text("match_type").notNull(), // 'exact', 'close', 'far', 'miss'
    actualPlayerId: uuid("actual_player_id").references(() => players.id),
    scoredAt: timestamp("scored_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pick_scores_board_pick_idx").on(table.boardId, table.pickNumber),
  ]
);

// ── BPA Rankings ──────────────────────────────────
export const bpaRankings = pgTable("bpa_rankings", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  espnAthleteId: text("espn_athlete_id"),
  rank: integer("rank").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

// ── App Config ────────────────────────────────────
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Push schema to database**

Run:
```powershell
cd C:\Users\brian\projects\slidey-draft ; npx drizzle-kit push
```

If the `scores` table drop/recreate causes issues (because existing rows reference it), the push tool may prompt. Accept the destructive migration — the old scores data is not in production use.

- [ ] **Step 3: Commit**

```powershell
git add src/db/schema.ts ; git commit -m "feat: add bpa_rankings, pick_scores, app_config tables; alter scores, picks, actual_results"
```

---

## Task 2: App Config Helper

**Files:**
- Create: `src/lib/config.ts`

- [ ] **Step 1: Create config helper**

```typescript
import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getConfig(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, key));
  return row?.value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function isDraftLocked(): Promise<boolean> {
  const val = await getConfig("draft_locked");
  return val === "true";
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/config.ts ; git commit -m "feat: add app config helper (get/set/isDraftLocked)"
```

---

## Task 3: ESPN API Service

**Files:**
- Create: `src/lib/espn-api.ts`

- [ ] **Step 1: Create ESPN API fetch layer**

```typescript
const ESPN_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons";
const TIMEOUT_MS = 10_000;

export type EspnPick = {
  pickNumber: number;
  teamRef: string; // URL to team resource
  athleteRef: string; // URL to athlete resource
  athleteName: string;
  athletePosition: string;
  athleteSchool: string;
  espnAthleteId: string;
};

export type EspnAthlete = {
  id: string;
  fullName: string;
  position: string;
  school: string;
  rank: number;
};

async function espnFetch<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[ESPN API] ${res.status} from ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[ESPN API] Error fetching ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, "")
    .trim();
}

async function resolveRef(url: string): Promise<any | null> {
  return espnFetch(url);
}

export async function fetchDraftPicks(season: number, round: number = 1): Promise<EspnPick[]> {
  const url = `${ESPN_BASE}/${season}/draft/rounds/${round}/picks?limit=50`;
  const data = await espnFetch<{ items?: any[]; count?: number }>(url);
  if (!data?.items) return [];

  const picks: EspnPick[] = [];
  for (const item of data.items) {
    try {
      // ESPN may return $ref links or inline data
      const pickData = item.$ref ? await resolveRef(item.$ref) : item;
      if (!pickData) continue;

      const pickNumber = pickData.pick ?? pickData.overall;
      if (!pickNumber) continue;

      // Resolve athlete
      const athleteRef = pickData.athlete?.$ref || pickData.athlete?.id;
      let athleteName = "";
      let athletePosition = "";
      let athleteSchool = "";
      let espnAthleteId = "";

      if (pickData.athlete?.$ref) {
        const athlete = await resolveRef(pickData.athlete.$ref);
        if (athlete) {
          athleteName = athlete.fullName || athlete.displayName || "";
          athletePosition = athlete.position?.abbreviation || "";
          athleteSchool = athlete.college?.name || athlete.college?.shortName || "";
          espnAthleteId = String(athlete.id || "");
        }
      } else if (pickData.athlete) {
        athleteName = pickData.athlete.fullName || pickData.athlete.displayName || "";
        athletePosition = pickData.athlete.position?.abbreviation || "";
        espnAthleteId = String(pickData.athlete.id || "");
      }

      if (!athleteName) continue;

      picks.push({
        pickNumber,
        teamRef: pickData.team?.$ref || "",
        athleteRef: pickData.athlete?.$ref || "",
        athleteName,
        athletePosition,
        athleteSchool,
        espnAthleteId,
      });
    } catch (err) {
      console.error(`[ESPN API] Error parsing pick item:`, err);
      continue;
    }
  }

  return picks;
}

export async function fetchDraftAthletes(season: number, limit: number = 100): Promise<EspnAthlete[]> {
  const url = `${ESPN_BASE}/${season}/draft/athletes?limit=${limit}`;
  const data = await espnFetch<{ items?: any[] }>(url);
  if (!data?.items) return [];

  const athletes: EspnAthlete[] = [];
  let rankCounter = 0;

  for (const item of data.items) {
    try {
      const athleteData = item.$ref ? await resolveRef(item.$ref) : item;
      if (!athleteData) continue;

      rankCounter++;
      athletes.push({
        id: String(athleteData.id || ""),
        fullName: athleteData.fullName || athleteData.displayName || "",
        position: athleteData.position?.abbreviation || "",
        school: athleteData.college?.name || athleteData.college?.shortName || "",
        rank: athleteData.rank ?? rankCounter,
      });
    } catch (err) {
      console.error(`[ESPN API] Error parsing athlete item:`, err);
      continue;
    }
  }

  return athletes;
}

export { normalizePlayerName };
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/espn-api.ts ; git commit -m "feat: add ESPN API fetch layer with timeout and error handling"
```

---

## Task 4: Scoring Engine Rewrite

**Files:**
- Rewrite: `src/lib/scoring.ts`

- [ ] **Step 1: Rewrite scoring.ts**

```typescript
import { db } from "@/db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { draftBoards, picks, scores, pickScores, actualResults, users } from "@/db/schema";

type ActualResult = {
  pickNumber: number;
  playerId: string;
  teamId: string;
};

/**
 * Score a single board against actual results.
 *
 * Scoring rules:
 *   Exact match (correct player at correct pick): 10 pts
 *   Right player, within 5 picks:                  5 pts
 *   Right player, 6+ picks off:                    3 pts
 *   Player not drafted in Round 1:                  0 pts
 *
 * Idempotent — recalculates from scratch each run.
 */
export async function scoreBoard(boardId: string, results: ActualResult[]) {
  if (results.length === 0) return;

  // Get all picks for this board
  const boardPicks = await db
    .select({
      pickNumber: picks.pickNumber,
      playerId: picks.playerId,
    })
    .from(picks)
    .where(eq(picks.boardId, boardId))
    .orderBy(asc(picks.pickNumber));

  // Build a map of actual playerId → actual pickNumber
  const actualByPlayer = new Map<string, number>();
  for (const r of results) {
    actualByPlayer.set(r.playerId, r.pickNumber);
  }

  // Build a set of actual pick numbers we can score against
  const actualPickNumbers = new Set(results.map((r) => r.pickNumber));

  let totalScore = 0;
  let correctExact = 0;
  let correctPlayer = 0;
  const pickScoreRows: {
    boardId: string;
    pickNumber: number;
    pointsAwarded: number;
    matchType: string;
    actualPlayerId: string | null;
  }[] = [];

  for (const pick of boardPicks) {
    // Only score picks where we have an actual result for that slot
    if (!actualPickNumbers.has(pick.pickNumber)) continue;

    // Find the actual result for this slot
    const actualForSlot = results.find((r) => r.pickNumber === pick.pickNumber);
    const actualPlayerId = actualForSlot?.playerId ?? null;

    // Did the user predict this player anywhere?
    const actualPickForPlayer = actualByPlayer.get(pick.playerId);

    let points = 0;
    let matchType = "miss";

    if (actualPickForPlayer !== undefined) {
      // Player was drafted in Round 1
      const delta = Math.abs(pick.pickNumber - actualPickForPlayer);
      if (delta === 0) {
        // Exact match: user predicted this player at this exact slot
        points = 10;
        matchType = "exact";
        correctExact++;
      } else if (delta <= 5) {
        points = 5;
        matchType = "close";
      } else {
        points = 3;
        matchType = "far";
      }
      correctPlayer++;
    }

    totalScore += points;
    pickScoreRows.push({
      boardId,
      pickNumber: pick.pickNumber,
      pointsAwarded: points,
      matchType,
      actualPlayerId,
    });
  }

  // Upsert pick_scores (delete + insert for this board)
  const scoredPickNumbers = pickScoreRows.map((r) => r.pickNumber);
  if (scoredPickNumbers.length > 0) {
    // Delete existing pick_scores for scored picks on this board
    for (const pn of scoredPickNumbers) {
      await db
        .delete(pickScores)
        .where(and(eq(pickScores.boardId, boardId), eq(pickScores.pickNumber, pn)));
    }
    await db.insert(pickScores).values(
      pickScoreRows.map((r) => ({
        boardId: r.boardId,
        pickNumber: r.pickNumber,
        pointsAwarded: r.pointsAwarded,
        matchType: r.matchType,
        actualPlayerId: r.actualPlayerId,
      }))
    );
  }

  // Calculate accuracy
  const scoredCount = pickScoreRows.length;
  const accuracyPct = scoredCount > 0 ? (correctPlayer / scoredCount) * 100 : 0;

  // Get board owner
  const [board] = await db
    .select({ createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));

  // Upsert scores summary
  const existing = await db
    .select({ id: scores.id })
    .from(scores)
    .where(eq(scores.boardId, boardId));

  if (existing.length > 0) {
    await db
      .update(scores)
      .set({
        totalScore,
        correctExact,
        correctPlayer,
        accuracyPct,
        updatedAt: new Date(),
      })
      .where(eq(scores.boardId, boardId));
  } else {
    await db.insert(scores).values({
      boardId,
      userId: board?.createdBy ?? null,
      totalScore,
      correctExact,
      correctPlayer,
      accuracyPct,
    });
  }
}

/**
 * Score all published/locked boards for a season.
 * Preserves previous_rank for trending arrows before recalculating.
 */
export async function scoreAllBoards(season: number) {
  // 1. Get current rankings to preserve as previous_rank
  const currentScores = await db
    .select({ boardId: scores.boardId, totalScore: scores.totalScore })
    .from(scores)
    .orderBy(desc(scores.totalScore));

  const currentRankMap = new Map<string, number>();
  currentScores.forEach((s, i) => {
    currentRankMap.set(s.boardId, i + 1);
  });

  // 2. Store previous_rank
  for (const [boardId, rank] of currentRankMap) {
    await db
      .update(scores)
      .set({ previousRank: rank })
      .where(eq(scores.boardId, boardId));
  }

  // 3. Get actual results
  const results = await db
    .select({
      pickNumber: actualResults.pickNumber,
      playerId: actualResults.playerId,
      teamId: actualResults.teamId,
    })
    .from(actualResults)
    .where(eq(actualResults.season, season))
    .orderBy(asc(actualResults.pickNumber));

  if (results.length === 0) return;

  // 4. Get all published/locked boards
  const boards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(
      and(
        eq(draftBoards.season, season),
        // Include both published and locked boards
      )
    );

  // Filter to published or locked
  const allBoards = await db
    .select({ id: draftBoards.id, status: draftBoards.status })
    .from(draftBoards)
    .where(eq(draftBoards.season, season));

  const eligibleBoards = allBoards.filter(
    (b) => b.status === "published" || b.status === "locked"
  );

  // 5. Score each board
  for (const board of eligibleBoards) {
    await scoreBoard(board.id, results);
  }
}
```

- [ ] **Step 2: Update actions.ts — change enterActualResult to call new scoring**

In `src/lib/actions.ts`, change the `enterActualResult` function. Replace:
```typescript
import { scoreAllBoards } from "@/lib/scoring";
```

The `enterActualResult` function's scoring call changes from:
```typescript
    await scoreAllBoards(season, pickNumber, playerId, teamId);
```
to:
```typescript
    await scoreAllBoards(season);
```

Also update `undoLastResult` — remove the per-pick scores deletion and replace with full re-score:
```typescript
export async function undoLastResult(season: number) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    throw new Error("Admin only");
  }

  const [last] = await db
    .select()
    .from(actualResults)
    .where(eq(actualResults.season, season))
    .orderBy(desc(actualResults.pickNumber))
    .limit(1);

  if (!last) return null;

  // Delete the actual result
  await db.delete(actualResults).where(eq(actualResults.id, last.id));

  // Re-score everything from scratch
  await scoreAllBoards(season);

  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  revalidatePath("/live");
  return last;
}
```

Update the imports in actions.ts — add `pickScores` if not already imported (it's not needed directly, scoring.ts handles it).

- [ ] **Step 3: Commit**

```powershell
git add src/lib/scoring.ts src/lib/actions.ts ; git commit -m "feat: rewrite scoring engine with 10/5/3 rules, trending arrows, pick_scores"
```

---

## Task 5: BPA Service

**Files:**
- Create: `src/lib/bpa.ts`

- [ ] **Step 1: Create BPA service**

```typescript
import { db } from "@/db";
import { eq, asc, and, notInArray } from "drizzle-orm";
import { bpaRankings, picks, players, draftBoards } from "@/db/schema";
import { fetchDraftAthletes, normalizePlayerName } from "@/lib/espn-api";

/**
 * Fetch ESPN BPA rankings and store in bpa_rankings table.
 * Matches ESPN athletes to our players table by normalized name + position.
 */
export async function fetchAndStoreBpaRankings(season: number): Promise<number> {
  const athletes = await fetchDraftAthletes(season);
  if (athletes.length === 0) return 0;

  // Get all our players
  const ourPlayers = await db.select().from(players);

  // Build a lookup: normalized name + position → player
  const playerLookup = new Map<string, typeof ourPlayers[number]>();
  for (const p of ourPlayers) {
    const key = `${normalizePlayerName(p.name)}|${p.position.toLowerCase()}`;
    playerLookup.set(key, p);
  }

  // Clear existing rankings
  await db.delete(bpaRankings);

  let matched = 0;
  for (const athlete of athletes) {
    const key = `${normalizePlayerName(athlete.fullName)}|${athlete.position.toLowerCase()}`;
    const player = playerLookup.get(key);

    if (player) {
      await db.insert(bpaRankings).values({
        playerId: player.id,
        espnAthleteId: athlete.id,
        rank: athlete.rank,
      });
      matched++;
    } else {
      console.warn(
        `[BPA] No match for ESPN athlete: ${athlete.fullName} (${athlete.position}, ${athlete.school})`
      );
    }
  }

  return matched;
}

/**
 * Auto-fill empty slots on a board with Best Player Available.
 * For each empty slot (pick 1-32 in order), assigns the top BPA player
 * not already on this board. Marks picks as auto_filled: true.
 */
export async function autoFillBPA(boardId: string): Promise<number> {
  // Get existing picks on this board
  const existingPicks = await db
    .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.boardId, boardId));

  const pickedNumbers = new Set(existingPicks.map((p) => p.pickNumber));
  const pickedPlayerIds = new Set(existingPicks.map((p) => p.playerId));

  // Get board info for season + team lookup
  const [board] = await db
    .select()
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) return 0;

  // Get draft order for team assignment
  const { draftOrder } = await import("@/db/schema");
  const order = await db
    .select({ pickNumber: draftOrder.pickNumber, teamId: draftOrder.teamId })
    .from(draftOrder)
    .where(eq(draftOrder.season, board.season))
    .orderBy(asc(draftOrder.pickNumber));

  const teamByPick = new Map(order.map((o) => [o.pickNumber, o.teamId]));

  // Get BPA rankings ordered by rank
  const rankings = await db
    .select({ playerId: bpaRankings.playerId, rank: bpaRankings.rank })
    .from(bpaRankings)
    .orderBy(asc(bpaRankings.rank));

  if (rankings.length === 0) return 0;

  let filled = 0;

  for (let pickNumber = 1; pickNumber <= 32; pickNumber++) {
    if (pickedNumbers.has(pickNumber)) continue;

    const teamId = teamByPick.get(pickNumber);
    if (!teamId) continue;

    // Find best available player not already on this board
    const bpaPlayer = rankings.find((r) => !pickedPlayerIds.has(r.playerId));
    if (!bpaPlayer) break;

    await db.insert(picks).values({
      boardId,
      pickNumber,
      playerId: bpaPlayer.playerId,
      teamId,
      autoFilled: true,
    });

    pickedPlayerIds.add(bpaPlayer.playerId);
    filled++;
  }

  return filled;
}

/**
 * Auto-fill all boards for a season.
 */
export async function autoFillAllBoards(season: number): Promise<number> {
  const boards = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(eq(draftBoards.season, season));

  let totalFilled = 0;
  for (const board of boards) {
    totalFilled += await autoFillBPA(board.id);
  }
  return totalFilled;
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/bpa.ts ; git commit -m "feat: add BPA ranking fetch + auto-fill service"
```

---

## Task 6: Updated Queries

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Update queries.ts imports and add new queries**

Add imports at the top:
```typescript
import {
  teams,
  players,
  draftOrder,
  draftBoards,
  picks,
  users,
  groups,
  groupMembers,
  actualResults,
  scores,
  pickScores,
  appConfig,
} from "@/db/schema";
```

Replace the existing `getLeaderboard` function with:

```typescript
// ── Leaderboard (new scores table) ────────────────
export async function getLeaderboard(season: number, groupMemberIds?: string[]) {
  // Get all scores joined with boards and users
  const rows = await db
    .select({
      boardId: scores.boardId,
      totalScore: scores.totalScore,
      correctExact: scores.correctExact,
      correctPlayer: scores.correctPlayer,
      accuracyPct: scores.accuracyPct,
      previousRank: scores.previousRank,
      boardTitle: draftBoards.title,
      boardStatus: draftBoards.status,
      boardSeason: draftBoards.season,
      createdBy: draftBoards.createdBy,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      userId: users.id,
    })
    .from(scores)
    .innerJoin(draftBoards, eq(scores.boardId, draftBoards.id))
    .leftJoin(users, eq(scores.userId, users.id))
    .where(eq(draftBoards.season, season))
    .orderBy(desc(scores.totalScore));

  let filtered = rows.filter(
    (r) => r.boardStatus === "published" || r.boardStatus === "locked"
  );

  if (groupMemberIds) {
    filtered = filtered.filter(
      (r) => r.createdBy && groupMemberIds.includes(r.createdBy)
    );
  }

  return filtered.map((r, index) => ({
    boardId: r.boardId,
    boardTitle: r.boardTitle,
    totalScore: r.totalScore,
    correctExact: r.correctExact,
    correctPlayer: r.correctPlayer,
    accuracyPct: r.accuracyPct,
    previousRank: r.previousRank,
    currentRank: index + 1,
    userName: r.userName || r.userEmail || "Anonymous",
    userRole: r.userRole || "user",
    userId: r.userId,
  }));
}
```

Add a new query for pick-level scoring:

```typescript
// ── Pick Scores for a board ───────────────────────
export async function getPickScoresForBoard(boardId: string) {
  return db
    .select({
      pickNumber: pickScores.pickNumber,
      pointsAwarded: pickScores.pointsAwarded,
      matchType: pickScores.matchType,
      actualPlayerId: pickScores.actualPlayerId,
      actualPlayerName: players.name,
      actualPlayerPosition: players.position,
      actualPlayerSchool: players.school,
    })
    .from(pickScores)
    .leftJoin(players, eq(pickScores.actualPlayerId, players.id))
    .where(eq(pickScores.boardId, boardId))
    .orderBy(asc(pickScores.pickNumber));
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/queries.ts ; git commit -m "feat: update leaderboard query for new scores table, add pick scores query"
```

---

## Task 7: API Routes

**Files:**
- Create: `src/app/api/draft/sync/route.ts`
- Create: `src/app/api/leaderboard/route.ts`
- Create: `src/app/api/admin/result/route.ts`
- Create: `src/app/api/admin/lock-draft/route.ts`
- Create: `src/app/api/admin/seed-bpa/route.ts`

- [ ] **Step 1: Create /api/draft/sync**

```typescript
// src/app/api/draft/sync/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { actualResults, players } from "@/db/schema";
import { fetchDraftPicks, normalizePlayerName } from "@/lib/espn-api";
import { scoreAllBoards } from "@/lib/scoring";
import { getConfig, setConfig, isDraftLocked } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";

const SEASON = 2026;
const RATE_LIMIT_MS = 10_000;

export async function GET() {
  try {
    // Rate limit: skip if last sync was <10s ago
    const lastSync = await getConfig("last_sync_at");
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync).getTime();
      if (elapsed < RATE_LIMIT_MS) {
        // Return cached state
        const existing = await db
          .select()
          .from(actualResults)
          .where(eq(actualResults.season, SEASON));
        return NextResponse.json({
          newPicks: 0,
          totalPicks: existing.length,
          cached: true,
        });
      }
    }

    await setConfig("last_sync_at", new Date().toISOString());

    // Fetch from ESPN
    const espnPicks = await fetchDraftPicks(SEASON);
    if (espnPicks.length === 0) {
      const existing = await db
        .select()
        .from(actualResults)
        .where(eq(actualResults.season, SEASON));
      return NextResponse.json({ newPicks: 0, totalPicks: existing.length });
    }

    // Get our players for matching
    const ourPlayers = await db.select().from(players);
    const playerLookup = new Map<string, typeof ourPlayers[number]>();
    for (const p of ourPlayers) {
      const key = `${normalizePlayerName(p.name)}|${p.position.toLowerCase()}`;
      playerLookup.set(key, p);
    }

    // Get existing results
    const existing = await db
      .select({ pickNumber: actualResults.pickNumber })
      .from(actualResults)
      .where(eq(actualResults.season, SEASON));
    const existingPicks = new Set(existing.map((e) => e.pickNumber));

    // Get draft order for team lookup
    const { draftOrder } = await import("@/db/schema");
    const order = await db
      .select({ pickNumber: draftOrder.pickNumber, teamId: draftOrder.teamId })
      .from(draftOrder)
      .where(eq(draftOrder.season, SEASON));
    const teamByPick = new Map(order.map((o) => [o.pickNumber, o.teamId]));

    let newPicks = 0;
    for (const pick of espnPicks) {
      if (existingPicks.has(pick.pickNumber)) continue;

      const key = `${normalizePlayerName(pick.athleteName)}|${pick.athletePosition.toLowerCase()}`;
      const player = playerLookup.get(key);

      if (!player) {
        console.warn(`[Sync] No match for: ${pick.athleteName} (${pick.athletePosition})`);
        continue;
      }

      const teamId = teamByPick.get(pick.pickNumber);
      if (!teamId) {
        console.warn(`[Sync] No team for pick #${pick.pickNumber}`);
        continue;
      }

      await db.insert(actualResults).values({
        season: SEASON,
        pickNumber: pick.pickNumber,
        playerId: player.id,
        teamId,
        espnAthleteId: pick.espnAthleteId,
        announcedAt: new Date(),
      }).onConflictDoNothing();

      newPicks++;
    }

    // Auto-lock if first result and not locked
    if (newPicks > 0) {
      const locked = await isDraftLocked();
      if (!locked) {
        await setConfig("draft_locked", "true");
        await autoFillAllBoards(SEASON);
      }
      await scoreAllBoards(SEASON);
    }

    const total = await db
      .select()
      .from(actualResults)
      .where(eq(actualResults.season, SEASON));

    return NextResponse.json({
      newPicks,
      totalPicks: total.length,
    });
  } catch (err) {
    console.error("[Sync] Error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create /api/leaderboard**

```typescript
// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActualResults } from "@/lib/queries";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { groupMembers } from "@/db/schema";

export async function GET(req: NextRequest) {
  const season = Number(req.nextUrl.searchParams.get("season") || "2026");
  const groupId = req.nextUrl.searchParams.get("groupId");

  let memberIds: string[] | undefined;
  if (groupId) {
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    memberIds = members.map((m) => m.userId);
  }

  const leaderboard = await getLeaderboard(season, memberIds);
  const results = await getActualResults(season);

  return NextResponse.json({
    leaderboard,
    picksScored: results.length,
    totalPicks: 32,
  });
}
```

- [ ] **Step 3: Create /api/admin/result**

```typescript
// src/app/api/admin/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actualResults } from "@/db/schema";
import { scoreAllBoards } from "@/lib/scoring";
import { isDraftLocked, setConfig } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";

const SEASON = 2026;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pickNumber, playerId, teamId } = body;

  if (!pickNumber || !playerId || !teamId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [result] = await db
    .insert(actualResults)
    .values({
      season: SEASON,
      pickNumber,
      playerId,
      teamId,
      announcedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (result) {
    const locked = await isDraftLocked();
    if (!locked) {
      await setConfig("draft_locked", "true");
      await autoFillAllBoards(SEASON);
    }
    await scoreAllBoards(SEASON);
  }

  return NextResponse.json({ success: true, result });
}
```

- [ ] **Step 4: Create /api/admin/lock-draft**

```typescript
// src/app/api/admin/lock-draft/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setConfig } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await setConfig("draft_locked", "true");
  const filled = await autoFillAllBoards(2026);

  return NextResponse.json({
    success: true,
    locked: true,
    boardsAutoFilled: filled,
  });
}
```

- [ ] **Step 5: Create /api/admin/seed-bpa**

```typescript
// src/app/api/admin/seed-bpa/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAndStoreBpaRankings } from "@/lib/bpa";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matched = await fetchAndStoreBpaRankings(2026);

  return NextResponse.json({
    success: true,
    matchedPlayers: matched,
  });
}
```

- [ ] **Step 6: Commit**

```powershell
git add src/app/api/ ; git commit -m "feat: add API routes for draft sync, leaderboard, admin result/lock/bpa"
```

---

## Task 8: useLiveUpdates Hook

**Files:**
- Create: `src/hooks/use-live-updates.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface LiveUpdateConfig {
  /** API endpoints to poll */
  endpoints: string[];
  /** Polling interval in ms (default 30000) */
  interval?: number;
  /** Whether polling is active */
  enabled?: boolean;
}

export interface LiveUpdateResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  /** Force an immediate refresh */
  refresh: () => void;
}

/**
 * Transport-agnostic live data hook.
 * Currently uses polling via setInterval + fetch.
 * Interface designed so internals can swap to SSE/WebSocket later.
 *
 * If multiple endpoints are provided, data is returned as an array
 * in the same order as the endpoints.
 */
export function useLiveUpdates<T = any>(
  config: LiveUpdateConfig
): LiveUpdateResult<T> {
  const { endpoints, interval = 30_000, enabled = true } = config;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    if (!enabled || endpoints.length === 0) return;

    try {
      const results = await Promise.all(
        endpoints.map(async (url) => {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`${res.status} from ${url}`);
          return res.json();
        })
      );

      if (!mountedRef.current) return;

      const value = endpoints.length === 1 ? results[0] : results;
      setData(value as T);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [endpoints.join(","), enabled]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchAll();

    // Set up polling
    const id = setInterval(fetchAll, interval);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAll, interval, enabled]);

  return { data, isLoading, error, lastUpdated, refresh: fetchAll };
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/hooks/use-live-updates.ts ; git commit -m "feat: add useLiveUpdates hook (transport-agnostic polling)"
```

---

## Task 9: Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getBoards, getUserBoard, getActualResults } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users, picks, players, teams, draftBoards } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const locked = await isDraftLocked();
  if (locked) redirect("/live");

  const season = 2026;
  const boards = await getBoards(season);
  const published = boards.filter((b) => b.status === "published");
  const userBoard = await getUserBoard(session.user.id, season);
  const results = await getActualResults(season);

  // Draft date
  const draftDate = new Date("2026-04-23T20:00:00-04:00");
  const now = new Date();
  const daysUntilDraft = Math.max(0, Math.ceil((draftDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Enrich boards with creator + picks
  const enrichedBoards = await Promise.all(
    published.map(async (board) => {
      let creator = null;
      if (board.createdBy) {
        const [u] = await db
          .select({ name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, board.createdBy));
        creator = u || null;
      }
      const boardPicks = await db
        .select({
          pickNumber: picks.pickNumber,
          playerName: players.name,
          playerPosition: players.position,
          playerSchool: players.school,
          teamAbbreviation: teams.abbreviation,
          teamPrimaryColor: teams.primaryColor,
          autoFilled: picks.autoFilled,
        })
        .from(picks)
        .innerJoin(players, eq(picks.playerId, players.id))
        .innerJoin(teams, eq(picks.teamId, teams.id))
        .where(eq(picks.boardId, board.id))
        .orderBy(asc(picks.pickNumber));
      return { ...board, creator, picks: boardPicks };
    })
  );

  // Sort: admin first, then user's own board, then rest
  const sorted = enrichedBoards.sort((a, b) => {
    const aIsAdmin = a.creator?.role === "admin" ? 0 : 1;
    const bIsAdmin = b.creator?.role === "admin" ? 0 : 1;
    if (aIsAdmin !== bIsAdmin) return aIsAdmin - bIsAdmin;
    const aIsUser = a.createdBy === session.user!.id ? 0 : 1;
    const bIsUser = b.createdBy === session.user!.id ? 0 : 1;
    return aIsUser - bIsUser;
  });

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-2xl font-bold text-white tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm text-white/60">
            <Link href="/picks" className="hover:text-white transition">All Picks</Link>
            <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
            <Link href="/my-board" className="hover:text-white transition">My Board</Link>
            {(session.user as any).role === "admin" && (
              <Link href="/admin" className="hover:text-white transition">Studio</Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Summary bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-4">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Published Mocks</p>
              <p className="text-2xl font-bold text-white">{published.length}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Your Mock</p>
              <p className="text-2xl font-bold text-white">
                {userBoard ? (userBoard.status === "published" ? "Published" : "Draft") : "Not Started"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Days Until Draft</p>
              <p className="text-2xl font-bold text-[var(--lions-blue)]">{daysUntilDraft}</p>
            </div>
          </div>
          {!userBoard && (
            <Link
              href="/my-board"
              className="rounded-lg bg-[var(--gtown-highlight)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
            >
              Create Your Mock Draft
            </Link>
          )}
        </div>

        {/* Comparison grid */}
        {sorted.length > 0 ? (
          <div className="mt-8 overflow-x-auto">
            <div className="inline-flex gap-4" style={{ minWidth: sorted.length * 280 }}>
              {sorted.map((board) => {
                const isAdmin = board.creator?.role === "admin";
                const isUser = board.createdBy === session.user!.id;

                return (
                  <div
                    key={board.id}
                    className={`w-[260px] shrink-0 rounded-xl border p-4 ${
                      isAdmin
                        ? "border-[var(--lions-blue)]/30 bg-gradient-to-b from-[#0076B6]/10 to-transparent"
                        : isUser
                        ? "border-[var(--gtown-highlight)]/30 bg-[var(--gtown-highlight)]/5"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {isAdmin && (
                        <span className="rounded-full bg-[var(--lions-blue)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          Featured
                        </span>
                      )}
                      {isUser && (
                        <span className="rounded-full bg-[var(--gtown-highlight)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          You
                        </span>
                      )}
                      <span className="text-sm font-bold text-white truncate">
                        {board.creator?.name || board.creator?.email || "Anonymous"}
                      </span>
                    </div>
                    <h3 className="text-xs text-white/50 truncate mb-3">{board.title}</h3>
                    <div className="space-y-1">
                      {Array.from({ length: 32 }, (_, i) => i + 1).map((num) => {
                        const pick = board.picks.find((p) => p.pickNumber === num);
                        return (
                          <div
                            key={num}
                            className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                          >
                            <span
                              className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: pick?.teamPrimaryColor || "#333" }}
                            >
                              {num}
                            </span>
                            {pick ? (
                              <span className={`text-white/80 truncate ${pick.autoFilled ? "italic" : ""}`}>
                                {pick.playerName}
                                {pick.autoFilled && (
                                  <span className="ml-1 text-[9px] text-yellow-400/60">BPA</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <Link
                      href={`/picks/${board.id}`}
                      className="mt-3 block text-center text-xs text-[var(--lions-blue)] hover:underline"
                    >
                      View Full Board
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40 text-lg">No published boards yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/dashboard/ ; git commit -m "feat: add pre-draft dashboard with comparison grid"
```

---

## Task 10: War Room Page

**Files:**
- Create: `src/app/live/page.tsx`
- Create: `src/app/live/war-room.tsx`

- [ ] **Step 1: Create War Room server shell**

```typescript
// src/app/live/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getActualResults, getDraftOrder } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { WarRoom } from "./war-room";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await auth();
  const locked = await isDraftLocked();

  if (!locked) redirect("/dashboard");

  const season = 2026;
  const draftOrder = await getDraftOrder(season);
  const userId = session?.user?.id || null;
  const userName = session?.user?.name || session?.user?.email || null;

  // Get initial data server-side for fast first paint
  const results = await getActualResults(season);

  let userBoardId: string | null = null;
  if (userId) {
    const board = await getUserBoard(userId, season);
    userBoardId = board?.id || null;
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-xl font-bold text-white tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">LIVE</span>
            </span>
            <nav className="flex gap-3 text-sm text-white/60">
              <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
              {session?.user && (
                <span className="text-white/40">{session.user.name || session.user.email}</span>
              )}
            </nav>
          </div>
        </div>
      </header>

      <WarRoom
        userId={userId}
        userName={userName}
        userBoardId={userBoardId}
        initialResults={results}
        draftOrder={draftOrder}
        season={season}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create War Room client component**

```typescript
// src/app/live/war-room.tsx
"use client";

import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useState } from "react";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
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
  boardTitle: string;
  totalScore: number;
  correctExact: number;
  correctPlayer: number;
  accuracyPct: number;
  previousRank: number | null;
  currentRank: number;
  userName: string;
  userRole: string;
  userId: string | null;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  picksScored: number;
  totalPicks: number;
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
  actualPlayerName: string | null;
};

type Props = {
  userId: string | null;
  userName: string | null;
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

export function WarRoom({
  userId,
  userName,
  userBoardId,
  initialResults,
  draftOrder,
  season,
}: Props) {
  // Poll leaderboard
  const { data: lbData } = useLiveUpdates<LeaderboardData>({
    endpoints: [`/api/leaderboard?season=${season}`],
    interval: 30_000,
    enabled: true,
  });

  // Poll sync endpoint (triggers server-side ESPN fetch + scoring)
  const { data: syncData, lastUpdated } = useLiveUpdates<{ totalPicks: number }>({
    endpoints: ["/api/draft/sync"],
    interval: 30_000,
    enabled: true,
  });

  // Poll user's board picks + scores
  const { data: boardData } = useLiveUpdates<{ picks: BoardPick[]; scores: PickScore[] } | null>({
    endpoints: userBoardId ? [`/api/board/${userBoardId}/live`] : [],
    interval: 30_000,
    enabled: !!userBoardId,
  });

  // Poll actual results
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

  // Calculate user's running total
  const runningTotal = userScores.reduce((sum, s) => sum + s.pointsAwarded, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/* Mobile: stacked. Desktop: three columns */}
      <div className="flex flex-col lg:grid lg:grid-cols-[300px_1fr_320px] gap-6">

        {/* LEFT: Actual Picks Feed */}
        <div className="order-3 lg:order-1">
          <h2
            className="text-lg font-bold text-white tracking-wide mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ACTUAL PICKS
          </h2>
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {results.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">
                Waiting for Round 1 to begin...
              </p>
            ) : (
              [...results].reverse().map((result) => (
                <div
                  key={result.pickNumber}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 animate-in fade-in duration-300"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: result.teamPrimaryColor || "#333" }}
                  >
                    {result.pickNumber}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {result.playerName}
                    </p>
                    <p className="text-xs text-white/40">
                      {result.playerPosition} &middot; {result.playerSchool} &middot; {result.teamAbbreviation}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER: Your Mock vs Actual */}
        <div className="order-2">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              YOUR MOCK VS ACTUAL
            </h2>
            {userPicks.length > 0 && (
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{runningTotal}</span>
                <span className="text-sm text-white/40 ml-1">pts</span>
              </div>
            )}
          </div>

          {!userBoardId ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-white/40">You don't have a mock draft to score.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {draftOrder.map((slot) => {
                const pick = pickMap.get(slot.pickNumber);
                const score = scoreMap.get(slot.pickNumber);
                const result = resultMap.get(slot.pickNumber);
                const matchType = score?.matchType || (result ? "miss" : null);

                return (
                  <div
                    key={slot.pickNumber}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      matchType
                        ? MATCH_COLORS[matchType] || "border-white/10 bg-white/5"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
                      style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}
                    >
                      {slot.pickNumber}
                    </div>

                    {/* Your pick */}
                    <div className="flex-1 min-w-0">
                      {pick ? (
                        <p className={`text-sm text-white/80 truncate ${pick.autoFilled ? "italic" : ""}`}>
                          {pick.playerName}
                          <span className="text-xs text-white/40 ml-1">{pick.playerPosition}</span>
                          {pick.autoFilled && (
                            <span className="ml-1 text-[9px] text-yellow-400/70 font-medium">BPA</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-white/20">—</p>
                      )}
                    </div>

                    {/* Actual */}
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

                    {/* Score badge */}
                    <div className="w-10 shrink-0 text-right">
                      {matchType && (
                        <span className={`text-xs font-bold ${
                          matchType === "exact" ? "text-green-400" :
                          matchType === "close" ? "text-yellow-400" :
                          matchType === "far" ? "text-orange-400" :
                          "text-red-400"
                        }`}>
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

        {/* RIGHT: Live Leaderboard */}
        <div className="order-1 lg:order-3">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              LEADERBOARD
            </h2>
            <span className="text-xs text-white/40">
              {picksScored} of 32 picks in
            </span>
          </div>
          <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-white/30 text-sm py-8 text-center">
                Scores will appear as picks come in
              </p>
            ) : (
              leaderboard.map((entry) => {
                const isAdmin = entry.userRole === "admin";
                const isUser = entry.userId === userId;
                const rankDelta = entry.previousRank
                  ? entry.previousRank - entry.currentRank
                  : 0;

                return (
                  <div
                    key={entry.boardId}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                      isAdmin
                        ? "border-[var(--lions-blue)]/30 bg-[#0076B6]/10"
                        : isUser
                        ? "border-[var(--gtown-highlight)]/30 bg-[var(--gtown-highlight)]/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span className="w-6 text-center text-sm font-bold text-white/60">
                      {entry.currentRank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">
                          {entry.userName}
                        </span>
                        {isAdmin && (
                          <span className="text-[8px] text-[var(--lions-blue)] font-bold uppercase">Dan</span>
                        )}
                      </div>
                      <p className="text-xs text-white/30">
                        {entry.accuracyPct?.toFixed(1)}% accuracy
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                      {rankDelta !== 0 && (
                        <p className={`text-[10px] font-medium ${
                          rankDelta > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {rankDelta > 0 ? `↑${rankDelta}` : `↓${Math.abs(rankDelta)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {lastUpdated && (
            <p className="mt-2 text-[10px] text-white/20 text-center">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create helper API routes for War Room polling**

The War Room polls for board picks+scores and actual results. Create two lightweight API routes:

```typescript
// src/app/api/board/[boardId]/live/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { picks, players, pickScores } from "@/db/schema";

type Params = Promise<{ boardId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { boardId } = await params;

  const boardPicks = await db
    .select({
      pickNumber: picks.pickNumber,
      playerName: players.name,
      playerPosition: players.position,
      autoFilled: picks.autoFilled,
    })
    .from(picks)
    .innerJoin(players, eq(picks.playerId, players.id))
    .where(eq(picks.boardId, boardId))
    .orderBy(asc(picks.pickNumber));

  const scores = await db
    .select({
      pickNumber: pickScores.pickNumber,
      pointsAwarded: pickScores.pointsAwarded,
      matchType: pickScores.matchType,
      actualPlayerName: players.name,
    })
    .from(pickScores)
    .leftJoin(players, eq(pickScores.actualPlayerId, players.id))
    .where(eq(pickScores.boardId, boardId))
    .orderBy(asc(pickScores.pickNumber));

  return NextResponse.json({ picks: boardPicks, scores });
}
```

```typescript
// src/app/api/draft/results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getActualResults } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const season = Number(req.nextUrl.searchParams.get("season") || "2026");
  const results = await getActualResults(season);
  return NextResponse.json(results);
}
```

- [ ] **Step 4: Commit**

```powershell
git add src/app/live/ src/app/api/board/ src/app/api/draft/results/ ; git commit -m "feat: add War Room live page with three-panel layout and polling"
```

---

## Task 11: Leaderboard Rewrite

**Files:**
- Modify: `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Rewrite leaderboard page with trending arrows and expandable rows**

```typescript
import Link from "next/link";
import { getLeaderboard, getActualResults } from "@/lib/queries";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await auth();
  const season = 2026;
  const leaderboard = await getLeaderboard(season);
  const results = await getActualResults(season);
  const allDone = results.length >= 32;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-2xl font-bold text-white tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm text-white/60">
            <Link href="/picks" className="hover:text-white transition">All Picks</Link>
            <Link href="/live" className="hover:text-white transition">War Room</Link>
            {session?.user ? (
              <Link href="/my-board" className="hover:text-white transition">My Board</Link>
            ) : (
              <Link href="/login" className="hover:text-white transition">Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {allDone && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-6 py-4 text-center">
            <p className="text-lg font-bold text-yellow-400">
              Final Results — All 32 Picks Scored
            </p>
          </div>
        )}

        <h1
          className="text-4xl font-bold text-white tracking-wide text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          LEADERBOARD
        </h1>
        <p className="mt-2 text-center text-white/50">
          {results.length}/32 picks scored &middot; 2026 NFL Draft
        </p>

        {leaderboard.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40 text-lg">
              No scores yet. The leaderboard will populate once draft results are entered.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {leaderboard.map((entry) => {
              const isAdmin = entry.userRole === "admin";
              const isUser = entry.userId === session?.user?.id;
              const rank = entry.currentRank;
              const rankDelta = entry.previousRank
                ? entry.previousRank - rank
                : 0;
              const scoredPicks = results.length;
              const accuracyDisplay = entry.accuracyPct?.toFixed(1) || "0.0";

              return (
                <Link
                  key={entry.boardId}
                  href={`/picks/${entry.boardId}`}
                  className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition hover:border-white/20 ${
                    isAdmin
                      ? "border-[var(--lions-blue)]/30 bg-gradient-to-r from-[#0076B6]/10 to-[#B0B7BC]/5"
                      : isUser
                      ? "border-[var(--gtown-highlight)]/30 bg-[var(--gtown-highlight)]/5"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                        rank === 1
                          ? "bg-yellow-500/20 text-yellow-400"
                          : rank === 2
                          ? "bg-gray-400/20 text-gray-300"
                          : rank === 3
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-white/5 text-white/40"
                      }`}
                    >
                      {allDone && rank === 1 ? "🏆" : rank}
                    </div>
                    {rankDelta !== 0 && (
                      <span className={`text-[10px] font-medium mt-0.5 ${
                        rankDelta > 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {rankDelta > 0 ? `↑${rankDelta}` : `↓${Math.abs(rankDelta)}`}
                      </span>
                    )}
                  </div>

                  {/* Name + board */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">
                        {entry.userName}
                      </span>
                      {isAdmin && (
                        <span className="rounded-full bg-[var(--lions-blue)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Featured Analyst
                        </span>
                      )}
                      {isUser && (
                        <span className="rounded-full bg-[var(--gtown-highlight)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/40 truncate">
                      {entry.boardTitle}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white">
                      {entry.totalScore}
                      <span className="text-sm font-normal text-white/40 ml-1">pts</span>
                    </div>
                    <div className="flex gap-3 text-xs text-white/40">
                      <span>{entry.correctExact} exact</span>
                      <span>{entry.correctPlayer} correct</span>
                      <span>{accuracyDisplay}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/leaderboard/ ; git commit -m "feat: rewrite leaderboard with trending arrows, accuracy %, clickable rows"
```

---

## Task 12: Scoring Breakdown on Board View

**Files:**
- Modify: `src/app/picks/[boardId]/page.tsx`

- [ ] **Step 1: Enhance board view with scoring overlay**

```typescript
import { notFound } from "next/navigation";
import { getBoardWithPicks, getActualResults, getPickScoresForBoard } from "@/lib/queries";
import Link from "next/link";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { scores } from "@/db/schema";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

const MATCH_BG: Record<string, string> = {
  exact: "border-green-500/30 bg-green-500/10",
  close: "border-yellow-500/30 bg-yellow-500/10",
  far: "border-orange-500/30 bg-orange-500/10",
  miss: "border-red-500/30 bg-red-500/10",
};

const MATCH_BADGE: Record<string, { text: string; color: string }> = {
  exact: { text: "+10", color: "text-green-400" },
  close: { text: "+5", color: "text-yellow-400" },
  far: { text: "+3", color: "text-orange-400" },
  miss: { text: "0", color: "text-red-400" },
};

export default async function PublicBoardPage({ params }: { params: Params }) {
  const { boardId } = await params;
  const data = await getBoardWithPicks(boardId);

  if (!data || data.board.status === "draft") notFound();

  const season = data.board.season;
  const results = await getActualResults(season);
  const pickScoreRows = await getPickScoresForBoard(boardId);
  const hasScoring = pickScoreRows.length > 0;

  // Get board total score
  let boardScore: { totalScore: number; correctExact: number; correctPlayer: number; accuracyPct: number | null } | null = null;
  if (hasScoring) {
    const [s] = await db
      .select({
        totalScore: scores.totalScore,
        correctExact: scores.correctExact,
        correctPlayer: scores.correctPlayer,
        accuracyPct: scores.accuracyPct,
      })
      .from(scores)
      .where(eq(scores.boardId, boardId));
    boardScore = s || null;
  }

  const scoreMap = new Map(pickScoreRows.map((s) => [s.pickNumber, s]));
  const resultMap = new Map(results.map((r) => [r.pickNumber, r]));

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/picks"
          className="text-sm text-white/40 hover:text-white/70 transition"
        >
          ← All Boards
        </Link>
        <h1
          className="mt-4 text-4xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.board.title.toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {data.board.season} NFL Mock Draft &middot;{" "}
          {data.picks.length} picks
        </p>

        {/* Score summary */}
        {boardScore && (
          <div className="mt-4 flex gap-6 rounded-xl border border-white/10 bg-white/5 px-6 py-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Score</p>
              <p className="text-3xl font-bold text-white">{boardScore.totalScore}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Exact</p>
              <p className="text-xl font-bold text-green-400">{boardScore.correctExact}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Correct</p>
              <p className="text-xl font-bold text-white">{boardScore.correctPlayer}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Accuracy</p>
              <p className="text-xl font-bold text-white">{boardScore.accuracyPct?.toFixed(1)}%</p>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-2">
          {data.picks.map((pick) => {
            const score = scoreMap.get(pick.pickNumber);
            const result = resultMap.get(pick.pickNumber);
            const matchType = score?.matchType;
            const badge = matchType ? MATCH_BADGE[matchType] : null;
            const bgClass = matchType ? MATCH_BG[matchType] : "border-white/10 bg-white/5";
            const isAutoFilled = (pick as any).autoFilled;

            return (
              <div
                key={pick.id}
                className={`flex items-center gap-4 rounded-lg border px-5 py-4 ${bgClass}`}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
                  style={{
                    backgroundColor: pick.teamPrimaryColor || "#333",
                  }}
                >
                  {pick.pickNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold text-white ${isAutoFilled ? "italic" : ""}`}>
                      {pick.playerName}
                      {isAutoFilled && (
                        <span className="ml-2 text-xs text-yellow-400/70 font-medium not-italic">BPA</span>
                      )}
                    </span>
                    <span className="rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--lions-blue)]">
                      {pick.playerPosition}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <span>{pick.playerSchool}</span>
                    <span className="text-white/20">→</span>
                    <span>{pick.teamName}</span>
                    <span className="text-xs text-white/30">({pick.teamAbbreviation})</span>
                  </div>
                  {/* Show actual pick if different */}
                  {result && matchType && matchType !== "exact" && (
                    <p className="mt-1 text-xs text-white/40">
                      Actual: <span className="text-white/60">{result.playerName}</span>{" "}
                      ({result.playerPosition}, {result.playerSchool})
                    </p>
                  )}
                </div>
                {/* Score badge */}
                {badge && (
                  <span className={`text-lg font-bold ${badge.color} shrink-0`}>
                    {badge.text}
                  </span>
                )}
                {pick.analysis && !hasScoring && (
                  <p className="text-xs text-white/40 max-w-xs text-right">
                    {pick.analysis}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update getBoardWithPicks to include autoFilled field**

In `src/lib/queries.ts`, update the `getBoardWithPicks` function's select to include `autoFilled`:

```typescript
// In the boardPicks select, add:
      autoFilled: picks.autoFilled,
```

After the existing fields in the `getBoardWithPicks` picks query.

- [ ] **Step 3: Commit**

```powershell
git add src/app/picks/[boardId]/page.tsx src/lib/queries.ts ; git commit -m "feat: add scoring breakdown overlay to board view"
```

---

## Task 13: Draft Lock Integration in Existing UI

**Files:**
- Modify: `src/app/my-board/page.tsx`
- Modify: `src/app/admin/board/[boardId]/pick-builder.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add draft-locked check to my-board page**

In `src/app/my-board/page.tsx`, add import at top:
```typescript
import { isDraftLocked } from "@/lib/config";
```

After `const season = 2026;` add:
```typescript
  const locked = await isDraftLocked();
```

After the header, before `<main>`, add the banner:
```typescript
      {locked && (
        <div className="bg-[var(--lions-blue)]/20 border-b border-[var(--lions-blue)]/30 px-6 py-3 text-center">
          <p className="text-sm font-medium text-[var(--lions-blue)]">
            Mock drafts are locked — the draft is live!{" "}
            <Link href="/live" className="underline hover:text-white transition">
              Watch in the War Room →
            </Link>
          </p>
        </div>
      )}
```

Pass `locked` to `PickBuilder` as a new prop `readOnly={locked}`.

- [ ] **Step 2: Add readOnly prop to PickBuilder**

In `src/app/admin/board/[boardId]/pick-builder.tsx`, add `readOnly?: boolean` to the Props type.

Add to destructuring: `readOnly = false`.

When `readOnly` is true:
- Don't show the publish button
- Don't allow clicking slots (change `onClick` to `() => {}` when readOnly)
- Don't show remove buttons
- Hide the prospect pool sidebar

Wrap the slot onClick: `onClick={() => !pick && !readOnly && setActiveSlot(isActive ? null : slot.pickNumber)}`

Wrap the publish button: `{!readOnly && boardStatus === "draft" && ...}`

Wrap the remove button: `{pick && !readOnly && ...}`

Wrap the sidebar: `{!readOnly && (<div className="rounded-xl ...">...</div>)}`

- [ ] **Step 3: Update home page nav**

In `src/app/page.tsx`, add nav links for Dashboard and Live:

```typescript
            <Link href="/dashboard" className="text-white/60 hover:text-white transition">
              Dashboard
            </Link>
            <Link href="/live" className="text-white/60 hover:text-white transition">
              Live
            </Link>
```

Add these in the nav section for logged-in users.

- [ ] **Step 4: Commit**

```powershell
git add src/app/my-board/page.tsx src/app/admin/board/[boardId]/pick-builder.tsx src/app/page.tsx ; git commit -m "feat: add draft-lock banner, read-only mode, nav links"
```

---

## Task 14: Group Leaderboard

**Files:**
- Modify: `src/app/group/[id]/page.tsx`

- [ ] **Step 1: Read existing group page**

Read `src/app/group/[id]/page.tsx` to understand current structure, then add a leaderboard section that calls `getLeaderboard(season, memberIds)` and renders a compact leaderboard below the existing member list.

- [ ] **Step 2: Add group leaderboard section**

Import `getLeaderboard` from queries. Get member IDs from the existing members query. Call `getLeaderboard(season, memberIds)`. Render a leaderboard section similar to the standalone leaderboard but more compact.

Add after existing content:
```tsx
        {/* Group Leaderboard */}
        {groupLeaderboard.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white tracking-wide mb-4" style={{ fontFamily: "var(--font-display)" }}>
              GROUP LEADERBOARD
            </h2>
            <div className="space-y-2">
              {groupLeaderboard.map((entry) => {
                const isAdmin = entry.userRole === "admin";
                return (
                  <Link
                    key={entry.boardId}
                    href={`/picks/${entry.boardId}`}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition hover:border-white/20 ${
                      isAdmin
                        ? "border-[var(--lions-blue)]/30 bg-[#0076B6]/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span className="w-8 text-center text-sm font-bold text-white/60">
                      {entry.currentRank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white">{entry.userName}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                    <span className="text-xs text-white/40">pts</span>
                  </Link>
                );
              })}
            </div>
            <Link href="/leaderboard" className="mt-3 block text-center text-xs text-[var(--lions-blue)] hover:underline">
              View Full Leaderboard
            </Link>
          </div>
        )}
```

- [ ] **Step 3: Commit**

```powershell
git add src/app/group/ ; git commit -m "feat: add group leaderboard section to group page"
```

---

## Task 15: Push Schema and Verify Build

- [ ] **Step 1: Push schema changes to database**

```powershell
cd C:\Users\brian\projects\slidey-draft ; npx drizzle-kit push
```

Expected: Tables created/modified without errors. If prompted about destructive changes to `scores` table, accept.

- [ ] **Step 2: Verify the app builds**

```powershell
cd C:\Users\brian\projects\slidey-draft ; npx next build
```

Fix any TypeScript or import errors that come up.

- [ ] **Step 3: Commit any fixes**

```powershell
git add -A ; git commit -m "fix: resolve build errors from Phase 2 Week 2"
```

---

## Task 16: Final Integration Commit

- [ ] **Step 1: Verify all files are committed**

```powershell
cd C:\Users\brian\projects\slidey-draft ; git status
```

- [ ] **Step 2: Create integration commit if needed**

```powershell
git add -A ; git commit -m "feat: Phase 2 Week 2 — ESPN API, scoring, war room, leaderboard"
```
