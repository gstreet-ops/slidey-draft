import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses, poolTriviaQueue, pools } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { recalculatePoolStandings } from "@/lib/pool-scoring";
import { getPoolSettings, getEffectiveScoring } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/answer — legacy endpoint, maps to new schema
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

  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, questionId));

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Get queue entry for pick number
  const [queueItem] = await db
    .select({ pickNumber: poolTriviaQueue.pickNumber })
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.questionId, questionId)));

  const pickNumber = queueItem?.pickNumber ?? 0;

  // Get pool settings for tiered trivia scoring
  const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const scoring = getEffectiveScoring(settings);
  const difficulty = question.difficulty as "easy" | "medium" | "hard";
  const tierPoints = scoring.triviaPointValues[difficulty] ?? scoring.triviaPointValues.medium;

  // Handle timeout — selectedAnswer of -1 means timeout
  const answerIdx = typeof selectedAnswer === "number" ? selectedAnswer : -1;
  const isCorrect = answerIdx === question.correctAnswer;
  const pointsAwarded = isCorrect ? tierPoints : 0;

  await db
    .insert(triviaResponses)
    .values({
      poolId,
      userId: session.user.id,
      questionId,
      pickNumber,
      selectedAnswer: answerIdx,
      isCorrect,
      pointsAwarded,
    })
    .onConflictDoNothing();

  await recalculatePoolStandings(poolId);

  return NextResponse.json({
    correct: isCorrect,
    correctAnswer: question.correctAnswer,
    pointsAwarded,
  });
}
