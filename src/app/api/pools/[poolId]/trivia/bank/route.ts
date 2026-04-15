import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses } from "@/db/schema";
import { eq, sql, isNull, isNotNull, asc } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all questions with response stats
  const questions = await db
    .select({
      id: triviaQuestions.id,
      question: triviaQuestions.question,
      optionA: triviaQuestions.optionA,
      optionB: triviaQuestions.optionB,
      optionC: triviaQuestions.optionC,
      optionD: triviaQuestions.optionD,
      correctOption: triviaQuestions.correctOption,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
      sortOrder: triviaQuestions.sortOrder,
      firedAt: triviaQuestions.firedAt,
      firedBy: triviaQuestions.firedBy,
      pickNumber: triviaQuestions.pickNumber,
      timerSeconds: triviaQuestions.timerSeconds,
      createdAt: triviaQuestions.createdAt,
    })
    .from(triviaQuestions)
    .orderBy(asc(triviaQuestions.sortOrder), asc(triviaQuestions.createdAt));

  // Get response stats per question for this pool
  const responseStats = await db
    .select({
      questionId: triviaResponses.questionId,
      totalResponses: sql<number>`count(*)`,
      correctResponses: sql<number>`count(*) filter (where ${triviaResponses.isCorrect} = true)`,
    })
    .from(triviaResponses)
    .where(eq(triviaResponses.poolId, poolId))
    .groupBy(triviaResponses.questionId);

  const statsMap = new Map(
    responseStats.map((s) => [s.questionId, { total: Number(s.totalResponses), correct: Number(s.correctResponses) }])
  );

  const enriched = questions.map((q) => {
    const stats = statsMap.get(q.id);
    return {
      ...q,
      used: !!q.firedAt,
      responseCount: stats?.total ?? 0,
      correctCount: stats?.correct ?? 0,
      accuracyPct: stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null,
    };
  });

  const unused = enriched.filter((q) => !q.used);
  const used = enriched.filter((q) => q.used);

  return NextResponse.json({ unused, used, total: enriched.length });
}
