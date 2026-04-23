/**
 * End-to-end test for the trivia rounds system.
 *
 * Runs against the production Neon DB (DATABASE_URL in .env.local).
 * Replicates the logic of the API handlers in
 *   src/app/api/pools/[poolId]/trivia/rounds/**
 *   src/app/api/pools/[poolId]/trivia/route.ts
 *   src/app/api/pools/[poolId]/trivia/respond/route.ts
 * so we verify the data layer without needing NextAuth cookies.
 *
 * Usage:
 *   npx tsx scripts/test-trivia-rounds.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, asc, eq, ilike, notInArray, sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { getPoolSettings, getEffectiveScoring } from "../src/lib/pool-helpers";

const {
  pools,
  users,
  poolMembers,
  triviaRounds,
  poolTriviaQueue,
  triviaQuestions,
  triviaResponses,
} = schema;

const neonSql = neon(process.env.DATABASE_URL!);
const db = drizzle(neonSql, { schema });

// ─── Test reporting ───────────────────────────────────────────
type Outcome = { step: string; ok: boolean; detail?: string };
const results: Outcome[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  const line = `  [${mark}] ${step}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
}

function fail(step: string, err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  record(step, false, `threw: ${msg}`);
  throw err;
}

// ─── Emulated handler ops ─────────────────────────────────────

async function createRound(poolId: string, opts: {
  label?: string | null;
  category?: string | null;
  questionCount: number;
  timerSeconds: number;
  isLightning: boolean;
}) {
  const usedRows = await db
    .select({ questionId: poolTriviaQueue.questionId })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));
  const usedIds = usedRows.map((r) => r.questionId);

  const whereParts = [eq(triviaQuestions.active, true)];
  if (opts.category) whereParts.push(eq(triviaQuestions.category, opts.category));
  if (usedIds.length > 0) whereParts.push(notInArray(triviaQuestions.id, usedIds));

  const available = await db
    .select({ id: triviaQuestions.id })
    .from(triviaQuestions)
    .where(and(...whereParts))
    .orderBy(sql`random()`)
    .limit(opts.questionCount);

  if (available.length < opts.questionCount) {
    throw new Error(`Only ${available.length} unused questions available (need ${opts.questionCount})`);
  }

  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(triviaRounds)
    .where(eq(triviaRounds.poolId, poolId));
  const nextSort = Number(maxRow?.max ?? 0) + 1;

  const [round] = await db
    .insert(triviaRounds)
    .values({
      poolId,
      label: opts.label ?? null,
      category: opts.category ?? null,
      questionCount: opts.questionCount,
      timerSeconds: opts.timerSeconds,
      isLightning: opts.isLightning,
      pointMultiplier: opts.isLightning ? 2 : 1,
      sortOrder: nextSort,
      status: "pending",
    })
    .returning();

  const [maxQueueRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));
  const queueBase = Number(maxQueueRow?.max ?? 0);

  await db.insert(poolTriviaQueue).values(
    available.map((q, i) => ({
      poolId,
      questionId: q.id,
      sortOrder: queueBase + i + 1,
      status: "pending" as const,
      roundId: round.id,
    }))
  );

  return round;
}

async function fireRound(poolId: string, roundId: string) {
  const [round] = await db
    .select()
    .from(triviaRounds)
    .where(and(eq(triviaRounds.id, roundId), eq(triviaRounds.poolId, poolId)));
  if (!round || round.status !== "pending") throw new Error("Round not firable");

  // Match the legacy /trivia/fire behavior: complete any currently-active queue entry
  // (a stale legacy one with round_id=NULL, or any other leftover) so /trivia returns the
  // new round question, not a prior active entry.
  await db
    .update(poolTriviaQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "active")));

  const [first] = await db
    .select({ id: poolTriviaQueue.id, questionId: poolTriviaQueue.questionId })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.roundId, roundId))
    .orderBy(asc(poolTriviaQueue.sortOrder))
    .limit(1);
  if (!first) throw new Error("No queue entries for round");

  await db
    .update(triviaRounds)
    .set({ status: "active", startedAt: new Date(), currentQuestionIndex: 0, pausedAt: null })
    .where(eq(triviaRounds.id, roundId));

  await db
    .update(poolTriviaQueue)
    .set({ status: "active", activatedAt: new Date() })
    .where(eq(poolTriviaQueue.id, first.id));

  return first.questionId;
}

async function pauseRound(roundId: string) {
  await db
    .update(triviaRounds)
    .set({ status: "paused", pausedAt: new Date() })
    .where(eq(triviaRounds.id, roundId));
}

async function resumeRound(roundId: string) {
  const [round] = await db.select().from(triviaRounds).where(eq(triviaRounds.id, roundId));
  if (!round) throw new Error("Round not found");

  await db
    .update(poolTriviaQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(poolTriviaQueue.roundId, roundId), eq(poolTriviaQueue.status, "active")));

  const nextIndex = round.currentQuestionIndex + 1;
  if (nextIndex >= round.questionCount) {
    await db
      .update(triviaRounds)
      .set({ status: "completed", completedAt: new Date(), pausedAt: null })
      .where(eq(triviaRounds.id, roundId));
    return { completed: true };
  }

  const entries = await db
    .select({ id: poolTriviaQueue.id, questionId: poolTriviaQueue.questionId })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.roundId, roundId))
    .orderBy(asc(poolTriviaQueue.sortOrder));
  const nextEntry = entries[nextIndex];

  await db
    .update(poolTriviaQueue)
    .set({ status: "active", activatedAt: new Date() })
    .where(eq(poolTriviaQueue.id, nextEntry.id));

  await db
    .update(triviaRounds)
    .set({ status: "active", pausedAt: null, currentQuestionIndex: nextIndex })
    .where(eq(triviaRounds.id, roundId));

  return { completed: false, questionId: nextEntry.questionId };
}

async function skipRound(roundId: string) {
  await db
    .update(poolTriviaQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(poolTriviaQueue.roundId, roundId), sql`${poolTriviaQueue.status} <> 'completed'`));

  await db
    .update(triviaRounds)
    .set({ status: "completed", completedAt: new Date(), pausedAt: null })
    .where(eq(triviaRounds.id, roundId));
}

/** Emulates GET /api/pools/[poolId]/trivia for a given user. */
async function getCurrent(poolId: string, userId: string) {
  const [pool] = await db.select({ settings: pools.settings }).from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const defaultTimerSeconds = settings.triviaTimerSeconds ?? 30;
  const scoring = getEffectiveScoring(settings);

  const [activeItem] = await db
    .select({
      questionId: poolTriviaQueue.questionId,
      roundId: poolTriviaQueue.roundId,
      activatedAt: poolTriviaQueue.activatedAt,
      question: triviaQuestions.question,
      difficulty: triviaQuestions.difficulty,
    })
    .from(poolTriviaQueue)
    .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "active")));

  if (!activeItem) {
    const [pausedRound] = await db
      .select()
      .from(triviaRounds)
      .where(and(eq(triviaRounds.poolId, poolId), eq(triviaRounds.status, "paused")))
      .limit(1);

    if (pausedRound) {
      const roundEntries = await db
        .select({ questionId: poolTriviaQueue.questionId })
        .from(poolTriviaQueue)
        .where(eq(poolTriviaQueue.roundId, pausedRound.id))
        .orderBy(asc(poolTriviaQueue.sortOrder));
      const entry = roundEntries[pausedRound.currentQuestionIndex];
      if (entry) {
        return {
          paused: true,
          id: entry.questionId,
          pointMultiplier: pausedRound.pointMultiplier,
          round: {
            id: pausedRound.id,
            label: pausedRound.label,
            isLightning: pausedRound.isLightning,
            pointMultiplier: pausedRound.pointMultiplier,
            status: pausedRound.status,
          },
        };
      }
    }
    return { noActiveQuestion: true };
  }

  let round: typeof triviaRounds.$inferSelect | null = null;
  if (activeItem.roundId) {
    const [r] = await db
      .select()
      .from(triviaRounds)
      .where(eq(triviaRounds.id, activeItem.roundId));
    round = r ?? null;
  }

  const paused = round ? round.status === "paused" : !!(settings as Record<string, unknown>).triviaPaused;
  const diffKey = activeItem.difficulty as "easy" | "medium" | "hard";
  const basePoints = scoring.triviaPointValues[diffKey] ?? scoring.triviaPointValues.medium;
  const pointMultiplier = round?.pointMultiplier ?? 1;

  const [existing] = await db
    .select({ id: triviaResponses.id })
    .from(triviaResponses)
    .where(
      and(
        eq(triviaResponses.poolId, poolId),
        eq(triviaResponses.userId, userId),
        eq(triviaResponses.questionId, activeItem.questionId)
      )
    );

  return {
    id: activeItem.questionId,
    paused,
    basePoints,
    pointMultiplier,
    displayPoints: basePoints * pointMultiplier,
    alreadyAnswered: !!existing,
    timerSeconds: round?.timerSeconds ?? defaultTimerSeconds,
    round: round
      ? {
          id: round.id,
          label: round.label,
          isLightning: round.isLightning,
          pointMultiplier: round.pointMultiplier,
          status: round.status,
        }
      : null,
  };
}

/** Emulates POST /api/pools/[poolId]/trivia/respond for a given user. */
async function submitResponse(poolId: string, userId: string, questionId: string, selectedAnswer: number) {
  const [question] = await db.select().from(triviaQuestions).where(eq(triviaQuestions.id, questionId));
  if (!question) throw new Error("Question not found");

  const [queueItem] = await db
    .select({ pickNumber: poolTriviaQueue.pickNumber, roundId: poolTriviaQueue.roundId })
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.questionId, questionId)));

  let pointMultiplier = 1;
  if (queueItem?.roundId) {
    const [round] = await db
      .select({ pointMultiplier: triviaRounds.pointMultiplier })
      .from(triviaRounds)
      .where(eq(triviaRounds.id, queueItem.roundId));
    if (round?.pointMultiplier) pointMultiplier = round.pointMultiplier;
  }

  const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const scoring = getEffectiveScoring(settings);
  const diffKey = question.difficulty as "easy" | "medium" | "hard";
  const tierPoints = scoring.triviaPointValues[diffKey] ?? scoring.triviaPointValues.medium;

  const isCorrect = selectedAnswer === question.correctAnswer;
  const basePoints = isCorrect ? tierPoints : 0;
  const pointsAwarded = basePoints * pointMultiplier;

  await db
    .insert(triviaResponses)
    .values({
      poolId,
      userId,
      questionId,
      pickNumber: queueItem?.pickNumber ?? 0,
      selectedAnswer,
      isCorrect,
      pointsAwarded,
      pointMultiplier,
    })
    .onConflictDoNothing();

  return { isCorrect, pointsAwarded, pointMultiplier, basePoints: tierPoints };
}

// ─── Test orchestration ───────────────────────────────────────

async function main() {
  console.log("\n═══ Trivia Rounds — End-to-End Test ═══\n");

  // Step 0 — find the Slidey pool + a member for the response
  let poolId: string;
  let userId: string;
  try {
    const [pool] = await db
      .select({ id: pools.id, name: pools.name, commissionerId: pools.commissionerId })
      .from(pools)
      .where(ilike(pools.name, "%slidey%"))
      .limit(1);
    if (!pool) throw new Error("No pool matching 'slidey' found");
    poolId = pool.id;
    userId = pool.commissionerId;
    record("Setup: locate Slidey pool", true, `poolId=${poolId.slice(0, 8)}… user=${userId.slice(0, 8)}…`);
  } catch (e) {
    fail("Setup: locate Slidey pool", e);
  }

  // Step 1 — list existing rounds
  try {
    const existing = await db
      .select()
      .from(triviaRounds)
      .where(eq(triviaRounds.poolId, poolId))
      .orderBy(asc(triviaRounds.sortOrder));
    record("1. List existing rounds", true, `${existing.length} round(s) already in pool`);
  } catch (e) {
    fail("1. List existing rounds", e);
  }

  // Preflight: clean up any test-labeled rounds left active/paused from a prior aborted run.
  // ONLY skip rounds labeled "Test Round" or "Lightning Test" — never touch a commissioner's real round.
  const TEST_LABELS = ["Test Round", "Lightning Test"];
  const stale = await db
    .select({ id: triviaRounds.id, label: triviaRounds.label, status: triviaRounds.status })
    .from(triviaRounds)
    .where(
      and(
        eq(triviaRounds.poolId, poolId),
        sql`status IN ('active','paused')`,
        sql`${triviaRounds.label} IN ${TEST_LABELS}`
      )
    );
  for (const s of stale) {
    await skipRound(s.id);
  }
  if (stale.length > 0) {
    record("Preflight: swept stale test rounds", true, `${stale.length} cleaned (${stale.map(s => s.label).join(", ")})`);
  }

  // Refuse to run if another (non-test) round is currently active/paused.
  const [busy] = await db
    .select({ id: triviaRounds.id, label: triviaRounds.label, status: triviaRounds.status })
    .from(triviaRounds)
    .where(and(eq(triviaRounds.poolId, poolId), sql`status IN ('active','paused')`))
    .limit(1);
  if (busy) {
    record(
      "Preflight: no busy round",
      false,
      `Round "${busy.label ?? busy.id.slice(0, 8)}" is ${busy.status} — aborting`
    );
    throw new Error("Cannot run test while another round is active/paused");
  }
  record("Preflight: no busy round", true);

  // Step 2 — create a non-lightning round
  let round1Id: string;
  try {
    const r = await createRound(poolId, {
      label: "Test Round",
      category: null,
      questionCount: 5,
      timerSeconds: 20,
      isLightning: false,
    });
    round1Id = r.id;
    const queueRows = await db
      .select({ id: poolTriviaQueue.id })
      .from(poolTriviaQueue)
      .where(eq(poolTriviaQueue.roundId, round1Id));
    const ok =
      r.status === "pending" &&
      r.questionCount === 5 &&
      r.timerSeconds === 20 &&
      r.isLightning === false &&
      r.pointMultiplier === 1 &&
      queueRows.length === 5;
    record(
      "2-3. Create round + 5 queue entries",
      ok,
      `status=${r.status} qCount=${r.questionCount} timer=${r.timerSeconds} lightning=${r.isLightning} mult=${r.pointMultiplier} queue=${queueRows.length}`
    );
    if (!ok) throw new Error("Round creation shape wrong");
  } catch (e) {
    fail("2-3. Create round + 5 queue entries", e);
  }

  // Step 4 — fire the round
  let currentQid: string;
  try {
    currentQid = await fireRound(poolId, round1Id);
    const [r] = await db.select().from(triviaRounds).where(eq(triviaRounds.id, round1Id));
    const [activeQ] = await db
      .select({ id: poolTriviaQueue.id, status: poolTriviaQueue.status, qid: poolTriviaQueue.questionId })
      .from(poolTriviaQueue)
      .where(and(eq(poolTriviaQueue.roundId, round1Id), eq(poolTriviaQueue.status, "active")));
    const ok = r.status === "active" && activeQ?.qid === currentQid;
    record("4. Fire round — status=active, first Q activated", ok, `roundStatus=${r.status} activeQid=${activeQ?.qid?.slice(0, 8)}`);
    if (!ok) throw new Error("Fire did not activate first question");
  } catch (e) {
    fail("4. Fire round", e);
  }

  // Step 5 — GET /trivia equivalent returns active Q with round context
  try {
    const current = await getCurrent(poolId, userId);
    const ok =
      current.id === currentQid &&
      current.round?.id === round1Id &&
      current.round?.label === "Test Round" &&
      current.pointMultiplier === 1 &&
      current.paused === false;
    record("5. GET /trivia returns active Q + round context", ok, JSON.stringify({
      id: current.id?.slice(0, 8),
      roundLabel: current.round?.label,
      mult: current.pointMultiplier,
      paused: current.paused,
    }));
    if (!ok) throw new Error("GET current did not return expected round context");
  } catch (e) {
    fail("5. GET /trivia returns round context", e);
  }

  // Step 6 — submit response, verify multiplier=1
  try {
    const result = await submitResponse(poolId, userId, currentQid, 0);
    const ok = result.pointMultiplier === 1;
    record(
      "6. Submit response — multiplier=1",
      ok,
      `isCorrect=${result.isCorrect} pointsAwarded=${result.pointsAwarded} base=${result.basePoints} mult=${result.pointMultiplier}`
    );
    if (!ok) throw new Error("Multiplier should be 1 for non-lightning round");
  } catch (e) {
    fail("6. Submit response — multiplier=1", e);
  }

  // Step 7 — pause the round
  try {
    await pauseRound(round1Id);
    const [r] = await db.select().from(triviaRounds).where(eq(triviaRounds.id, round1Id));
    const ok = r.status === "paused" && r.pausedAt !== null;
    record("7. Pause round — status=paused", ok, `status=${r.status} pausedAt=${r.pausedAt?.toISOString() ?? "null"}`);
    if (!ok) throw new Error("Pause did not set status/pausedAt");
  } catch (e) {
    fail("7. Pause round", e);
  }

  // Step 8 — GET /trivia returns paused=true
  try {
    // Use a different user so alreadyAnswered doesn't short-circuit
    const [otherMember] = await db
      .select({ userId: poolMembers.userId })
      .from(poolMembers)
      .where(and(eq(poolMembers.poolId, poolId), sql`${poolMembers.userId} <> ${userId}`))
      .limit(1);
    const viewerId = otherMember?.userId ?? userId;

    const current = await getCurrent(poolId, viewerId);
    const ok = current.paused === true && current.round?.status === "paused";
    record(
      "8. GET /trivia — paused=true",
      ok,
      `paused=${current.paused} roundStatus=${current.round?.status}`
    );
    if (!ok) throw new Error("GET during pause did not reflect paused state");
  } catch (e) {
    fail("8. GET /trivia paused", e);
  }

  // Step 9 — resume, verify advance to Q2
  try {
    const before = await db.select().from(triviaRounds).where(eq(triviaRounds.id, round1Id));
    const beforeIdx = before[0].currentQuestionIndex;

    const res = await resumeRound(round1Id);
    const [r] = await db.select().from(triviaRounds).where(eq(triviaRounds.id, round1Id));
    const ok =
      !res.completed &&
      r.status === "active" &&
      r.pausedAt === null &&
      r.currentQuestionIndex === beforeIdx + 1;
    record(
      "9. Resume — advances to next question",
      ok,
      `from Q${beforeIdx + 1} → Q${r.currentQuestionIndex + 1}, status=${r.status}, newQid=${("questionId" in res ? res.questionId?.slice(0, 8) : "-")}`
    );
    if (!ok) throw new Error("Resume did not advance index");
  } catch (e) {
    fail("9. Resume", e);
  }

  // Step 10 — skip, verify completed
  try {
    await skipRound(round1Id);
    const [r] = await db.select().from(triviaRounds).where(eq(triviaRounds.id, round1Id));
    const pendingLeft = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(poolTriviaQueue)
      .where(and(eq(poolTriviaQueue.roundId, round1Id), sql`${poolTriviaQueue.status} <> 'completed'`));
    const ok = r.status === "completed" && Number(pendingLeft[0].n) === 0;
    record(
      "10. Skip round — completed + no remaining",
      ok,
      `status=${r.status} uncompletedQs=${pendingLeft[0].n}`
    );
    if (!ok) throw new Error("Skip did not complete round or queue entries");
  } catch (e) {
    fail("10. Skip round", e);
  }

  // Step 11 — create lightning round
  let round2Id: string;
  try {
    const r = await createRound(poolId, {
      label: "Lightning Test",
      category: null,
      questionCount: 3,
      timerSeconds: 15,
      isLightning: true,
    });
    round2Id = r.id;
    const ok =
      r.status === "pending" &&
      r.isLightning === true &&
      r.pointMultiplier === 2 &&
      r.questionCount === 3 &&
      r.timerSeconds === 15;
    record(
      "11. Create lightning round",
      ok,
      `status=${r.status} lightning=${r.isLightning} mult=${r.pointMultiplier} qCount=${r.questionCount} timer=${r.timerSeconds}`
    );
    if (!ok) throw new Error("Lightning round shape wrong");
  } catch (e) {
    fail("11. Create lightning round", e);
  }

  // Step 12 — fire it and verify /trivia reports multiplier=2
  let lightningQid: string;
  try {
    lightningQid = await fireRound(poolId, round2Id);
    // Use a fresh viewer user so alreadyAnswered doesn't trip us
    const [viewer] = await db
      .select({ userId: poolMembers.userId })
      .from(poolMembers)
      .where(and(eq(poolMembers.poolId, poolId), sql`${poolMembers.userId} <> ${userId}`))
      .limit(1);
    const viewerId = viewer?.userId ?? userId;
    const current = await getCurrent(poolId, viewerId);
    const ok =
      current.id === lightningQid &&
      current.pointMultiplier === 2 &&
      current.round?.isLightning === true;
    record(
      "12. Fire lightning round — multiplier=2 in /trivia",
      ok,
      `qid=${current.id?.slice(0, 8)} mult=${current.pointMultiplier} isLightning=${current.round?.isLightning} displayPoints=${current.displayPoints}`
    );
    if (!ok) throw new Error("Lightning round multiplier not reflected in /trivia");
  } catch (e) {
    fail("12. Fire lightning round", e);
  }

  // Step 13 — submit a correct answer and verify points_awarded = base * 2
  try {
    const [q] = await db
      .select({ correctAnswer: triviaQuestions.correctAnswer, difficulty: triviaQuestions.difficulty })
      .from(triviaQuestions)
      .where(eq(triviaQuestions.id, lightningQid));

    // Use a viewer user (not commissioner — commissioner may have an earlier response on this same question from a prior test run)
    const [viewer] = await db
      .select({ userId: poolMembers.userId })
      .from(poolMembers)
      .where(and(eq(poolMembers.poolId, poolId), sql`${poolMembers.userId} <> ${userId}`))
      .limit(1);
    const viewerId = viewer?.userId ?? userId;

    // Clean any existing response from this user on this question so the insert takes effect
    await db
      .delete(triviaResponses)
      .where(
        and(
          eq(triviaResponses.poolId, poolId),
          eq(triviaResponses.userId, viewerId),
          eq(triviaResponses.questionId, lightningQid)
        )
      );

    const result = await submitResponse(poolId, viewerId, lightningQid, q.correctAnswer);
    const expected = result.basePoints * 2;
    const ok =
      result.isCorrect === true &&
      result.pointMultiplier === 2 &&
      result.pointsAwarded === expected;
    record(
      "13. Lightning response — points = base × 2",
      ok,
      `base=${result.basePoints} mult=${result.pointMultiplier} awarded=${result.pointsAwarded} (expected ${expected})`
    );
    if (!ok) throw new Error("Lightning scoring incorrect");
  } catch (e) {
    fail("13. Lightning response points", e);
  }

  // Step 14 — clean up
  try {
    await skipRound(round2Id);
    const [r] = await db.select().from(triviaRounds).where(eq(triviaRounds.id, round2Id));
    record("14. Cleanup (skip lightning round)", r.status === "completed", `status=${r.status}`);
  } catch (e) {
    fail("14. Cleanup", e);
  }

  // ─── Summary ───
  console.log("\n═══ Summary ═══");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.step}`);
  }
  console.log(`\n  ${passed}/${passed + failed} passed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  // Print partial summary even on crash
  console.log("\n═══ Partial Summary ═══");
  for (const r of results) console.log(`  ${r.ok ? "✓" : "✗"} ${r.step}${r.detail ? ` — ${r.detail}` : ""}`);
  process.exit(1);
});
