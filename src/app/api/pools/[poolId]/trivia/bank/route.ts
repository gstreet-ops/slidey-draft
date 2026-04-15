import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses, poolTriviaQueue } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
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

  // Get queue for this pool with question details
  const queue = await db
    .select({
      questionId: poolTriviaQueue.questionId,
      sortOrder: poolTriviaQueue.sortOrder,
      status: poolTriviaQueue.status,
      activatedAt: poolTriviaQueue.activatedAt,
      completedAt: poolTriviaQueue.completedAt,
      pickNumber: poolTriviaQueue.pickNumber,
      question: triviaQuestions.question,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
    })
    .from(poolTriviaQueue)
    .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
    .where(eq(poolTriviaQueue.poolId, poolId))
    .orderBy(asc(poolTriviaQueue.sortOrder));

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

  const enriched = queue.map((q) => {
    const stats = statsMap.get(q.questionId);
    return {
      ...q,
      id: q.questionId,
      responseCount: stats?.total ?? 0,
      correctCount: stats?.correct ?? 0,
      accuracyPct: stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null,
    };
  });

  const pending = enriched.filter((q) => q.status === "pending");
  const active = enriched.filter((q) => q.status === "active");
  const completed = enriched.filter((q) => q.status === "completed");

  return NextResponse.json({ pending, active, completed, total: enriched.length });
}
