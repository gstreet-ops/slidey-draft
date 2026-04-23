import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue, triviaQuestions, triviaResponses, pools, triviaRounds } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getPoolSettings, getEffectiveScoring } from "@/lib/pool-helpers";

// GET /api/pools/[poolId]/trivia — returns currently active question for the pool
// Round-aware: if the active question belongs to a round, we include round context.
// Falls back to legacy (round_id = NULL) behavior if no rounds exist.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  // Get pool fallback timer settings + effective scoring for base points
  const [pool] = await db.select({ settings: pools.settings }).from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const defaultTimerSeconds = settings.triviaTimerSeconds ?? 30;
  const scoring = getEffectiveScoring(settings);

  // Find the active queue item in this pool
  const [activeItem] = await db
    .select({
      queueId: poolTriviaQueue.id,
      questionId: poolTriviaQueue.questionId,
      sortOrder: poolTriviaQueue.sortOrder,
      status: poolTriviaQueue.status,
      activatedAt: poolTriviaQueue.activatedAt,
      pickNumber: poolTriviaQueue.pickNumber,
      roundId: poolTriviaQueue.roundId,
      question: triviaQuestions.question,
      options: triviaQuestions.options,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
    })
    .from(poolTriviaQueue)
    .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "active")));

  if (!activeItem) {
    // If there's a paused round with a question that hasn't been completed yet, surface it
    const [pausedRound] = await db
      .select()
      .from(triviaRounds)
      .where(and(eq(triviaRounds.poolId, poolId), eq(triviaRounds.status, "paused")))
      .limit(1);

    if (pausedRound) {
      // Find the question the round is paused on (currentQuestionIndex within this round's queue order)
      const roundEntries = await db
        .select({
          questionId: poolTriviaQueue.questionId,
          sortOrder: poolTriviaQueue.sortOrder,
          question: triviaQuestions.question,
          options: triviaQuestions.options,
          category: triviaQuestions.category,
          difficulty: triviaQuestions.difficulty,
        })
        .from(poolTriviaQueue)
        .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
        .where(eq(poolTriviaQueue.roundId, pausedRound.id))
        .orderBy(poolTriviaQueue.sortOrder);

      const entry = roundEntries[pausedRound.currentQuestionIndex];
      if (entry) {
        const diffKey = entry.difficulty as "easy" | "medium" | "hard";
        const basePoints = scoring.triviaPointValues[diffKey] ?? scoring.triviaPointValues.medium;
        return NextResponse.json({
          id: entry.questionId,
          question: entry.question,
          options: entry.options,
          category: entry.category,
          difficulty: entry.difficulty,
          sortOrder: entry.sortOrder,
          totalQueued: pausedRound.questionCount,
          timerSeconds: pausedRound.timerSeconds,
          expiresAt: null,
          pickNumber: null,
          paused: true,
          live: true,
          basePoints,
          pointMultiplier: pausedRound.pointMultiplier,
          displayPoints: basePoints * pausedRound.pointMultiplier,
          round: {
            id: pausedRound.id,
            label: pausedRound.label,
            progress: `Q${pausedRound.currentQuestionIndex + 1} of ${pausedRound.questionCount}`,
            currentQuestionIndex: pausedRound.currentQuestionIndex,
            questionCount: pausedRound.questionCount,
            isLightning: pausedRound.isLightning,
            pointMultiplier: pausedRound.pointMultiplier,
            status: pausedRound.status,
          },
        });
      }
    }

    return NextResponse.json({ noActiveQuestion: true });
  }

  // If this queue entry belongs to a round, load round context for timer + multiplier
  let round: typeof triviaRounds.$inferSelect | null = null;
  if (activeItem.roundId) {
    const [r] = await db
      .select()
      .from(triviaRounds)
      .where(eq(triviaRounds.id, activeItem.roundId));
    round = r ?? null;
  }

  const timerSeconds = round?.timerSeconds ?? defaultTimerSeconds;
  const pointMultiplier = round?.pointMultiplier ?? 1;
  const isLightning = round?.isLightning ?? false;
  const paused = round ? round.status === "paused" : !!(settings as Record<string, unknown>).triviaPaused;

  // Check if user already answered this question
  const [existing] = await db
    .select({ id: triviaResponses.id })
    .from(triviaResponses)
    .where(
      and(
        eq(triviaResponses.poolId, poolId),
        eq(triviaResponses.userId, session.user.id),
        eq(triviaResponses.questionId, activeItem.questionId)
      )
    );

  if (existing) {
    return NextResponse.json({ alreadyAnswered: true, questionId: activeItem.questionId });
  }

  const activatedAt = activeItem.activatedAt?.getTime() ?? Date.now();
  const expiresAt = activatedAt + timerSeconds * 1000;

  // If expired and the round is still active (not paused), surface as no active question
  // so the client re-polls and the commissioner's resume can advance things.
  if (!paused && Date.now() > expiresAt) {
    return NextResponse.json({ noActiveQuestion: true, expired: true });
  }

  // Queue size for legacy progress display
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));

  const diffKey = activeItem.difficulty as "easy" | "medium" | "hard";
  const basePoints = scoring.triviaPointValues[diffKey] ?? scoring.triviaPointValues.medium;

  return NextResponse.json({
    id: activeItem.questionId,
    question: activeItem.question,
    options: activeItem.options,
    category: activeItem.category,
    difficulty: activeItem.difficulty,
    sortOrder: activeItem.sortOrder,
    totalQueued: round ? round.questionCount : Number(countRow.count),
    timerSeconds,
    expiresAt,
    pickNumber: activeItem.pickNumber,
    paused,
    live: true,
    basePoints,
    pointMultiplier,
    displayPoints: basePoints * pointMultiplier,
    round: round
      ? {
          id: round.id,
          label: round.label,
          progress: `Q${round.currentQuestionIndex + 1} of ${round.questionCount}`,
          currentQuestionIndex: round.currentQuestionIndex,
          questionCount: round.questionCount,
          isLightning,
          pointMultiplier,
          status: round.status,
        }
      : null,
  });
}
