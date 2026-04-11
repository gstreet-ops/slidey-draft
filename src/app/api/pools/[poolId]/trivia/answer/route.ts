import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses, pools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recalculatePoolStandings } from "@/lib/pool-scoring";
import { getPoolSettings, getEffectiveScoring } from "@/lib/pool-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const { questionId, selectedOption } = await req.json();

  if (!questionId || !selectedOption) {
    return NextResponse.json({ error: "questionId and selectedOption required" }, { status: 400 });
  }

  const question = await db.query.triviaQuestions.findFirst({
    where: (q, { eq: e }) => e(q.id, questionId),
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Get pool settings for tiered trivia scoring
  const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const scoring = getEffectiveScoring(settings);
  const difficulty = (question.difficulty || "medium") as "easy" | "medium" | "hard";
  const tierPoints = scoring.triviaPointValues[difficulty] ?? scoring.triviaPointValues.medium;

  const isCorrect = selectedOption === question.correctOption;
  const pointsAwarded = isCorrect ? tierPoints : 0;

  await db
    .insert(triviaResponses)
    .values({
      poolId,
      userId: session.user.id,
      questionId,
      selectedOption,
      isCorrect,
      pointsAwarded,
    })
    .onConflictDoNothing();

  // Update standings so trivia points appear on leaderboards immediately
  await recalculatePoolStandings(poolId);

  return NextResponse.json({
    correct: isCorrect,
    correctOption: question.correctOption,
    pointsAwarded,
  });
}
