import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue, triviaQuestions, actualResults } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/fire — manually fire the next question in queue
export async function POST(
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

  // Complete any currently active question
  await db
    .update(poolTriviaQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "active")));

  // Find next pending question
  const [next] = await db
    .select({
      id: poolTriviaQueue.id,
      questionId: poolTriviaQueue.questionId,
      sortOrder: poolTriviaQueue.sortOrder,
    })
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "pending")))
    .orderBy(asc(poolTriviaQueue.sortOrder))
    .limit(1);

  if (!next) {
    return NextResponse.json({ success: false, error: "No more questions in queue" });
  }

  // Get current pick number
  const [latestPick] = await db
    .select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, 2026))
    .orderBy(sql`pick_number DESC`)
    .limit(1);

  const currentPick = latestPick?.pickNumber ?? 0;

  // Activate the question
  await db
    .update(poolTriviaQueue)
    .set({ status: "active", activatedAt: new Date(), pickNumber: currentPick })
    .where(eq(poolTriviaQueue.id, next.id));

  // Fetch question details
  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, next.questionId));

  return NextResponse.json({
    success: true,
    question: question
      ? {
          id: question.id,
          question: question.question,
          options: question.options,
          category: question.category,
          difficulty: question.difficulty,
          sortOrder: next.sortOrder,
          pickNumber: currentPick,
        }
      : null,
  });
}
