# Trivia Queue Redesign — Predetermined Order + Commissioner Manual Questions

## Context

The trivia system (Section 12 of phase3-prompt.md) was originally designed to randomly select questions from the question bank after each pick. We're replacing that with a **predetermined, per-pool ordered queue** system. Commissioners control the exact order questions fire in, can create their own custom questions (any category — not limited to football), and manage everything via drag-and-drop in the admin UI.

**Important:** Trivia is not yet implemented — only the spec exists. Build it fresh with this design.

---

## SCHEMA CHANGES

### `trivia_questions` table (UPDATED from original spec)

```
- id (uuid, primary key)
- question (text, not null)
- options (jsonb, not null) — array of 4 strings
- correct_answer (integer, not null) — 0-indexed into options
- category (text, not null) — freetext field, any value allowed (e.g. 'nfl_history', 'pop_culture', 'inside_jokes', 'movies', etc.)
- difficulty (enum: 'easy', 'medium', 'hard', default 'medium')
- active (boolean, default true)
- created_by (uuid, FK → users.id, nullable) — null = seeded by system, non-null = created by a commissioner
- created_at (timestamp, default now())
```
### NEW: `pool_trivia_queue` table

This is the core of the redesign. Each pool has its own ordered queue of questions.

```
- id (uuid, primary key)
- pool_id (uuid, FK → pools.id, not null)
- question_id (uuid, FK → trivia_questions.id, not null)
- sort_order (integer, not null) — 1-indexed position in the queue (1 = fires first)
- status (enum: 'pending', 'active', 'completed', default 'pending')
- activated_at (timestamp, nullable) — when this question went live
- completed_at (timestamp, nullable) — when the window closed
- pick_number (integer, nullable) — which draft pick this question was paired with
- unique constraint on (pool_id, question_id) — each question appears once per pool
- unique constraint on (pool_id, sort_order) — no duplicate positions
```

### `trivia_responses` table (UNCHANGED from original spec)

```
- id (uuid, primary key)
- pool_id (uuid, FK → pools.id, not null)
- user_id (uuid, FK → users.id, not null)
- question_id (uuid, FK → trivia_questions.id, not null)
- pick_number (integer, not null)
- selected_answer (integer, not null)
- is_correct (boolean, not null)
- points_awarded (integer, not null, default 0)
- submitted_at (timestamp, default now())
- unique constraint on (pool_id, user_id, question_id)
```
---

## TRIVIA FLOW (REPLACES RANDOM SELECTION)

1. **Pre-draft setup:** Commissioner builds the question queue for their pool on `/admin/trivia`. They add questions from the global bank (seeded or manually created) and drag them into the exact order they want. The queue is stored in `pool_trivia_queue`.

2. **Round 1 starts:** After pick #1 is announced and scored, the system fires the question at `sort_order = 1` from the pool's queue. Its status flips from `pending` → `active`.

3. **Between picks:** After each subsequent pick is announced and scored, the system advances to the next `pending` question in sort_order. The previous question's status becomes `completed`.

4. **Window:** Same as before — question is live from the pick announcement until the NEXT pick is confirmed. Trivia and predictions run in parallel.

5. **If queue runs out:** If all questions are completed and there are still picks remaining, no trivia fires for the remaining picks. The trivia card shows "No more trivia questions" or simply hides.

6. **Scoring:** Same tiered system — Easy: 3 pts, Medium: 5 pts, Hard: 10 pts. Commissioner can also override via `triviaPointValues` in pool settings.

---

## COMMISSIONER QUESTION CREATION

### Admin Trivia Page (`/admin/trivia`)

This page has TWO sections:

#### Section 1: Question Bank (top half)

- Shows all available questions in a filterable/searchable table
- Columns: Question (truncated), Category, Difficulty, Source (System / Commissioner name), Active toggle
- Filter by: category (dropdown built from distinct categories in the table), difficulty, source- "Create Question" button opens a modal/inline form:
  - **Question text** (textarea, required)
  - **Option A / B / C / D** (4 text inputs, all required)
  - **Correct answer** (radio buttons selecting A/B/C/D, maps to 0-3 index)
  - **Category** (text input with autocomplete from existing categories — freetext, user can type any new category like "pop culture", "inside jokes", "music", "movies", anything)
  - **Difficulty** (dropdown: easy / medium / hard)
- Commissioner can also edit or deactivate existing questions they created
- System-seeded questions are read-only (commissioner can deactivate but not edit them)

#### Section 2: Pool Queue Builder (bottom half)

- Pool selector dropdown at the top (commissioner picks which pool they're managing)
- **Left panel: Available Questions** — all active questions NOT yet in this pool's queue. Searchable/filterable same as the bank above. Each question has an "Add to Queue" button (adds to bottom of the queue).
- **Right panel: Queue Order** — the ordered list of questions for this pool. Drag-and-drop reorderable. Each item shows:
  - Position number (1, 2, 3...)
  - Question text (truncated)
  - Category badge
  - Difficulty badge (color-coded: green/yellow/red)
  - Status indicator (pending / active / completed)
  - Remove button (X) — only for pending questions
- Drag-and-drop reorders the `sort_order` values. Only `pending` questions can be reordered. `active` and `completed` questions are locked in place at the top.
- "Add All Unused" bulk action — adds all active questions not already in the queue, appended to the bottom in random order
- Queue count display: "23 questions queued — enough for 23 picks"
### API Routes for Queue Management

- `GET /api/pools/[poolId]/trivia/queue` — returns the full ordered queue for a pool (admin only)
- `POST /api/pools/[poolId]/trivia/queue` — bulk set the queue: `{ questions: [{ questionId, sortOrder }] }`. Replaces existing pending items.
- `PUT /api/pools/[poolId]/trivia/queue/reorder` — `{ questionId, newSortOrder }`. Shifts other items to accommodate.
- `DELETE /api/pools/[poolId]/trivia/queue/[questionId]` — remove a pending question from the queue
- `POST /api/trivia/questions` — create a new question (commissioner only): `{ question, options, correctAnswer, category, difficulty }`
- `PUT /api/trivia/questions/[questionId]` — edit a question (only if created_by = current user)
- `GET /api/trivia/questions` — list all active questions with optional filters

### Existing Routes (same as original spec)

- `GET /api/pools/[poolId]/trivia/current` — returns the currently active question for the pool (from pool_trivia_queue where status = 'active')
- `POST /api/pools/[poolId]/trivia/respond` — submit answer `{ questionId, selectedAnswer }`

---

## SEED FILE UPDATE

`src/db/seed-trivia.ts` still seeds 50+ questions but now:
- Sets `created_by = null` for all seeded questions (marks them as system-generated)
- Includes a broader set of categories. Keep the NFL/draft core, but also add a handful of general knowledge and pop culture questions to demonstrate that the system supports any category:
  - ~35 NFL/draft questions (nfl_history, draft_trivia, team_trivia, prospects)
  - ~10 general sports questions (sports_general)
  - ~5 pop culture / general knowledge questions (pop_culture, general_knowledge)
- Each question has appropriate difficulty ratings
---

## DRAFT-NIGHT ADMIN CONTROLS UPDATE

The Trivia Control panel in the War Room admin view should show:
- **Current question** in the queue (with position number, e.g. "Q7 of 23")
- **Timer controls** — same as before (15/30/45/60 seconds)
- **Skip button** — skip the current question and advance to the next in queue (marks current as completed with no responses)
- **Pause/Resume** — temporarily pause auto-advance between picks
- **Queue preview** — collapsible list showing the next 3 upcoming questions

Remove the Auto/Manual mode toggle from the original spec. The queue IS the plan. The commissioner can intervene with Skip or Pause, but the default behavior is always "advance to next in queue."

---

## UI COMPONENT UPDATES

The trivia card component (`src/components/trivia.tsx`) behavior is mostly unchanged:
- Shows question + 4 answer buttons + countdown bar
- Lock on selection, no confirmation
- Reveal correct answer when window closes
- NEW: Show the question's category as a small badge on the trivia card (e.g. "🏈 NFL History" or "🎬 Pop Culture")

---

## IMPLEMENTATION ORDER

1. Migration: create `trivia_questions`, `pool_trivia_queue`, and `trivia_responses` tables
2. Seed file: `src/db/seed-trivia.ts` with 50 questions
3. API routes: question CRUD, queue management, current question, respond
4. Admin UI: `/admin/trivia` with question bank + queue builder + drag-and-drop
5. Player UI: trivia card component in War Room
6. Draft-night integration: auto-advance queue on pick confirmation
7. Scoring integration: wire trivia points into combined score
8. Admin controls: skip, pause, queue preview in War Room admin panel
---

## KEY BEHAVIORAL RULES

- Questions fire in `sort_order` sequence — NEVER random
- Each pool has its own independent queue
- Commissioner controls the order via drag-and-drop before (and during) the draft
- Category is freetext — no enum restriction. Autocomplete from existing values for convenience
- System-seeded questions can be deactivated but not edited by commissioners
- Commissioner-created questions can be edited/deactivated by their creator
- Completed/active questions in the queue are locked — only pending can be reordered or removed
- If the queue is empty or exhausted, trivia simply stops — no error, no fallback to random