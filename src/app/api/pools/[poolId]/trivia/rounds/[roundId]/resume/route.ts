import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaRounds, poolTriviaQueue, triviaQuestions, actualResults } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/rounds/[roundId]/resume
// Advances to the next question and activates it. If we were on the last, completes the round.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string; roundId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId, roundId } = await params;
  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [round] = await db
    .select()
    .from(triviaRounds)
    .where(and(eq(triviaRounds.id, roundId), eq(triviaRounds.poolId, poolId)));

  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  if (round.status !== "paused") {
    return NextResponse.json({ error: `Cannot resume round in status ${round.status}` }, { status: 400 });
  }

  // Complete the currently-active (or paused-at) question in this round
  await db
    .update(poolTriviaQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(poolTriviaQueue.roundId, roundId), eq(poolTriviaQueue.status, "active")));

  const nextIndex = round.currentQuestionIndex + 1;

  // If we've exhausted the round, complete it
  if (nextIndex >= round.questionCount) {
    await db
      .update(triviaRounds)
      .set({ status: "completed", completedAt: new Date(), pausedAt: null })
      .where(eq(triviaRounds.id, roundId));
    return NextResponse.json({ success: true, completed: true });
  }

  // Grab all queue entries for this round in order, pick the one at nextIndex
  const entries = await db
    .select({ id: poolTriviaQueue.id, questionId: poolTriviaQueue.questionId, sortOrder: poolTriviaQueue.sortOrder })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.roundId, roundId))
    .orderBy(asc(poolTriviaQueue.sortOrder));

  const nextEntry = entries[nextIndex];
  if (!nextEntry) {
    // Shouldn't happen — treat as completed
    await db
      .update(triviaRounds)
      .set({ status: "completed", completedAt: new Date(), pausedAt: null })
      .where(eq(triviaRounds.id, roundId));
    return NextResponse.json({ success: true, completed: true });
  }

  const [latestPick] = await db
    .select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, 2026))
    .orderBy(sql`pick_number DESC`)
    .limit(1);
  const currentPick = latestPick?.pickNumber ?? 0;

  await db
    .update(poolTriviaQueue)
    .set({ status: "active", activatedAt: new Date(), pickNumber: currentPick })
    .where(eq(poolTriviaQueue.id, nextEntry.id));

  await db
    .update(triviaRounds)
    .set({ status: "active", pausedAt: null, currentQuestionIndex: nextIndex })
    .where(eq(triviaRounds.id, roundId));

  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, nextEntry.questionId));

  return NextResponse.json({
    success: true,
    completed: false,
    currentQuestionIndex: nextIndex,
    question: question
      ? {
          id: question.id,
          question: question.question,
          options: question.options,
          category: question.category,
          difficulty: question.difficulty,
          sortOrder: nextEntry.sortOrder,
          pickNumber: currentPick,
        }
      : null,
  });
}
