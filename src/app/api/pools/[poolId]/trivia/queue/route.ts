import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue, triviaQuestions } from "@/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import { canManagePool } from "@/lib/pool-helpers";

// GET /api/pools/[poolId]/trivia/queue — full ordered queue (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  if (!(await canManagePool(session.user.id, poolId)) && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const queue = await db
    .select({
      id: poolTriviaQueue.id,
      questionId: poolTriviaQueue.questionId,
      sortOrder: poolTriviaQueue.sortOrder,
      status: poolTriviaQueue.status,
      activatedAt: poolTriviaQueue.activatedAt,
      completedAt: poolTriviaQueue.completedAt,
      pickNumber: poolTriviaQueue.pickNumber,
      question: triviaQuestions.question,
      options: triviaQuestions.options,
      correctAnswer: triviaQuestions.correctAnswer,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
    })
    .from(poolTriviaQueue)
    .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
    .where(eq(poolTriviaQueue.poolId, poolId))
    .orderBy(asc(poolTriviaQueue.sortOrder));

  return NextResponse.json({ queue });
}

// POST /api/pools/[poolId]/trivia/queue — bulk set queue (replaces pending items)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  if (!(await canManagePool(session.user.id, poolId)) && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questions } = await req.json();
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: "questions array required" }, { status: 400 });
  }

  // Delete only pending items — active/completed are locked
  await db
    .delete(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "pending")));

  // Get max sort_order of non-pending items
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(sort_order), 0)` })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));
  let nextOrder = (maxRow?.max ?? 0) + 1;

  // Insert new pending items
  for (const q of questions) {
    const questionId = q.questionId || q;
    await db
      .insert(poolTriviaQueue)
      .values({
        poolId,
        questionId,
        sortOrder: q.sortOrder || nextOrder++,
        status: "pending",
      })
      .onConflictDoNothing();
  }

  return NextResponse.json({ success: true });
}
