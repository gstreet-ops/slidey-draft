import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses, poolTriviaQueue, pools, triviaRounds } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { recalculatePoolStandings } from "@/lib/pool-scoring";
import { getPoolSettings, getEffectiveScoring } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/respond — submit answer { questionId, selectedAnswer }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const { questionId, selectedAnswer } = await req.json();

  if (!questionId || selectedAnswer == null) {
    return NextResponse.json({ error: "questionId and selectedAnswer required" }, { status: 400 });
  }

  // Verify question exists
  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, questionId));

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Get queue entry for pick number + round linkage
  const [queueItem] = await db
    .select({ pickNumber: poolTriviaQueue.pickNumber, roundId: poolTriviaQueue.roundId })
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.questionId, questionId)));

  const pickNumber = queueItem?.pickNumber ?? 0;

  // Look up round multiplier if this question is part of a round
  let pointMultiplier = 1;
  if (queueItem?.roundId) {
    const [round] = await db
      .select({ pointMultiplier: triviaRounds.pointMultiplier })
      .from(triviaRounds)
      .where(eq(triviaRounds.id, queueItem.roundId));
    if (round?.pointMultiplier) pointMultiplier = round.pointMultiplier;
  }

  // Get pool settings for tiered trivia scoring
  const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const scoring = getEffectiveScoring(settings);
  const difficulty = question.difficulty as "easy" | "medium" | "hard";
  const tierPoints = scoring.triviaPointValues[difficulty] ?? scoring.triviaPointValues.medium;

  const isCorrect = selectedAnswer === question.correctAnswer;
  const basePoints = isCorrect ? tierPoints : 0;
  const pointsAwarded = basePoints * pointMultiplier;

  await db
    .insert(triviaResponses)
    .values({
      poolId,
      userId: session.user.id,
      questionId,
      pickNumber,
      selectedAnswer,
      isCorrect,
      pointsAwarded,
      pointMultiplier,
    })
    .onConflictDoNothing();

  // Update standings
  await recalculatePoolStandings(poolId);

  return NextResponse.json({
    correct: isCorrect,
    correctAnswer: question.correctAnswer,
    pointsAwarded,
    pointMultiplier,
  });
}
