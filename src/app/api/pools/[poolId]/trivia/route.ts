import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue, triviaQuestions, triviaResponses, pools } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getPoolSettings } from "@/lib/pool-helpers";

// GET /api/pools/[poolId]/trivia — returns currently active question for the pool
// (from pool_trivia_queue where status = 'active')
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  // Get pool timer settings
  const [pool] = await db.select({ settings: pools.settings }).from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const timerSeconds = settings.triviaTimerSeconds ?? 30;

  // Find the active question in this pool's queue
  const [activeItem] = await db
    .select({
      queueId: poolTriviaQueue.id,
      questionId: poolTriviaQueue.questionId,
      sortOrder: poolTriviaQueue.sortOrder,
      status: poolTriviaQueue.status,
      activatedAt: poolTriviaQueue.activatedAt,
      pickNumber: poolTriviaQueue.pickNumber,
      question: triviaQuestions.question,
      options: triviaQuestions.options,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
    })
    .from(poolTriviaQueue)
    .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "active")));

  if (!activeItem) {
    return NextResponse.json({ noActiveQuestion: true });
  }

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

  // Calculate expiration
  const activatedAt = activeItem.activatedAt?.getTime() ?? Date.now();
  const expiresAt = activatedAt + timerSeconds * 1000;

  // If expired, mark as no active question
  if (Date.now() > expiresAt) {
    return NextResponse.json({ noActiveQuestion: true, expired: true });
  }

  // Get total queue count for progress
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));

  const paused = !!(settings as Record<string, unknown>).triviaPaused;

  return NextResponse.json({
    id: activeItem.questionId,
    question: activeItem.question,
    options: activeItem.options,
    category: activeItem.category,
    difficulty: activeItem.difficulty,
    sortOrder: activeItem.sortOrder,
    totalQueued: Number(countRow.count),
    timerSeconds,
    expiresAt,
    pickNumber: activeItem.pickNumber,
    paused,
    live: true,
  });
}
