import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaRounds, poolTriviaQueue, triviaQuestions, actualResults } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/rounds/[roundId]/fire — start a pending round
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
  if (round.status !== "pending") {
    return NextResponse.json({ error: `Round is already ${round.status}` }, { status: 400 });
  }

  // Refuse if another round is active or paused
  const [busy] = await db
    .select({ id: triviaRounds.id, status: triviaRounds.status })
    .from(triviaRounds)
    .where(
      and(
        eq(triviaRounds.poolId, poolId),
        sql`${triviaRounds.status} IN ('active','paused')`
      )
    )
    .limit(1);
  if (busy) {
    return NextResponse.json(
      { error: "Another round is active or paused", activeRoundId: busy.id },
      { status: 409 }
    );
  }

  // First question = lowest sort_order in this round
  const [first] = await db
    .select({ id: poolTriviaQueue.id, questionId: poolTriviaQueue.questionId, sortOrder: poolTriviaQueue.sortOrder })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.roundId, roundId))
    .orderBy(asc(poolTriviaQueue.sortOrder))
    .limit(1);

  if (!first) {
    return NextResponse.json({ error: "Round has no questions" }, { status: 400 });
  }

  const [latestPick] = await db
    .select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, 2026))
    .orderBy(sql`pick_number DESC`)
    .limit(1);
  const currentPick = latestPick?.pickNumber ?? 0;

  // Mark round active
  await db
    .update(triviaRounds)
    .set({ status: "active", startedAt: new Date(), currentQuestionIndex: 0, pausedAt: null })
    .where(eq(triviaRounds.id, roundId));

  // Activate first question
  await db
    .update(poolTriviaQueue)
    .set({ status: "active", activatedAt: new Date(), pickNumber: currentPick })
    .where(eq(poolTriviaQueue.id, first.id));

  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, first.questionId));

  return NextResponse.json({
    success: true,
    roundId,
    question: question
      ? {
          id: question.id,
          question: question.question,
          options: question.options,
          category: question.category,
          difficulty: question.difficulty,
          sortOrder: first.sortOrder,
          pickNumber: currentPick,
        }
      : null,
  });
}
