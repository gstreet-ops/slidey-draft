# Fix Trivia Admin Page — Queue Bug, AI Gen, Layout, Dupes

## BUG 1: Can only add one question to queue (CRITICAL)

**Root cause:** In `src/components/trivia-queue.tsx`, the `addToQueue()` function calls `POST /api/pools/[poolId]/trivia/queue` with only the single new question. But the POST handler in `src/app/api/pools/[poolId]/trivia/queue/route.ts` first DELETES all pending items, then inserts only what was sent. So adding question #2 deletes question #1.

**Fix — change the client to append, not replace:**

In `src/components/trivia-queue.tsx`, change `addToQueue()` to NOT use the bulk POST endpoint. Instead, create a new dedicated append endpoint or change the approach:

**Option (best): Add a PUT/POST append route**

Create a new route: `POST /api/pools/[poolId]/trivia/queue/add`
- Accepts: `{ questionId: string }`
- Calculates the next sort_order: `SELECT COALESCE(MAX(sort_order), 0) + 1 FROM pool_trivia_queue WHERE pool_id = $poolId`
- Inserts a single row with that sort_order, status = 'pending'
- Uses `onConflictDoNothing()` to handle duplicate question adds gracefully
- Returns `{ success: true, sortOrder: number }`

Then update `addToQueue()` in `trivia-queue.tsx` to call this new endpoint instead of the bulk POST.

Keep the bulk POST endpoint as-is for "Add All Unused" — but fix it to NOT delete existing pending items. Instead, make it additive: calculate the max sort_order and append all new questions after it. Only skip questions already in the queue (via onConflictDoNothing).

**Changes needed:**
- `src/app/api/pools/[poolId]/trivia/queue/add/route.ts` — NEW file, single question append
- `src/app/api/pools/[poolId]/trivia/queue/route.ts` — Fix POST to be additive, not destructive
- `src/components/trivia-queue.tsx` — Update `addToQueue()` to use the new /add endpoint

## BUG 2: AI Trivia Generator not working

**Root cause:** The generate route at `src/app/api/admin/trivia/generate/route.ts` uses `new Anthropic()` which requires the `ANTHROPIC_API_KEY` environment variable. This is likely not set in Vercel.

**Fix:**
1. Check if `ANTHROPIC_API_KEY` is in `.env.local`. If not, add a placeholder comment.
2. More importantly: add error handling to the generate route so it returns a useful error message instead of a generic 500:

```typescript
try {
  const message = await client.messages.create({ ... });
} catch (err) {
  console.error("Anthropic API error:", err);
  return NextResponse.json(
    { error: "AI generation failed. Check that ANTHROPIC_API_KEY is set in environment variables." },
    { status: 500 }
  );
}
```

3. In the admin trivia page component (`src/app/admin/trivia/page.tsx`), make sure the AI generator section shows the error message from the API response to the user, not just a generic failure.

4. Also: the generate endpoint returns questions but does NOT save them to the database. The admin page should have a "Save" or "Add to Bank" step after generation. Check if this flow exists. If the generated questions aren't being saved to `trivia_questions` table, that's another bug. The save endpoint is at `src/app/api/admin/trivia/save/route.ts` — verify it works and is being called after generation.

## BUG 3: Duplicate questions in the bank (from double seed)

**Fix:** Write a one-time cleanup query. Run it in seed-trivia.ts or as a standalone script:

```sql
DELETE FROM trivia_questions a
USING trivia_questions b
WHERE a.id > b.id
AND a.question = b.question
AND a.created_by IS NULL
AND b.created_by IS NULL;
```

In Drizzle, add a `deduplicateTrivia()` function to `src/db/seed-trivia.ts` that:
1. Finds all system-seeded questions (created_by IS NULL) grouped by question text
2. For each group with more than 1 row, keeps the oldest (min id) and deletes the rest
3. Also removes any duplicate pool_trivia_queue entries that reference deleted question IDs
4. Log how many dupes were removed

Run this dedupe as part of the seed script (idempotent — safe to run multiple times).

## LAYOUT FIX: Pool Queue Builder should be above Question Bank

In `src/app/admin/trivia/page.tsx`, swap the order of the two sections:
- Move "POOL QUEUE BUILDER" section (with the TriviaQueue component) to the TOP
- Move "QUESTION BANK" section below it
- Keep "AI TRIVIA GENERATOR" at the bottom (collapsed)

This makes more sense for the workflow: commissioner sees their queue first, then scrolls down to browse/create questions to add to it.

## IMPLEMENTATION ORDER

1. Fix the queue append bug (Bug 1) — this is the critical blocker
2. Deduplicate questions (Bug 3) — clean data
3. Fix AI generator error handling (Bug 2) — better UX
4. Swap layout order (Layout fix) — quick change
5. Run `npx tsc --noEmit` to verify no type errors
6. Run `npm run build` to verify build succeeds
7. Git commit all fixes