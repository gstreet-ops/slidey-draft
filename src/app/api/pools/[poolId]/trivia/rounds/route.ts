import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaRounds, triviaQuestions, poolTriviaQueue } from "@/db/schema";
import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// GET /api/pools/[poolId]/trivia/rounds — list rounds with progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  const rows = await db
    .select()
    .from(triviaRounds)
    .where(eq(triviaRounds.poolId, poolId))
    .orderBy(asc(triviaRounds.sortOrder), asc(triviaRounds.createdAt));

  return NextResponse.json({
    rounds: rows.map((r) => ({
      id: r.id,
      label: r.label,
      category: r.category,
      questionCount: r.questionCount,
      timerSeconds: r.timerSeconds,
      isLightning: r.isLightning,
      pointMultiplier: r.pointMultiplier,
      sortOrder: r.sortOrder,
      status: r.status,
      currentQuestionIndex: r.currentQuestionIndex,
      progress: `Q${Math.min(r.currentQuestionIndex + 1, r.questionCount)} of ${r.questionCount}`,
      startedAt: r.startedAt,
      pausedAt: r.pausedAt,
      completedAt: r.completedAt,
    })),
  });
}

// POST /api/pools/[poolId]/trivia/rounds — create a round
// Body: { label?, category?, questionCount, timerSeconds, isLightning }
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

  const body = await req.json();
  const label: string | null = body.label?.trim() || null;
  const category: string | null = body.category?.trim() || null; // null = mixed
  const questionCount: number = Number(body.questionCount);
  const timerSeconds: number = Number(body.timerSeconds);
  const isLightning: boolean = !!body.isLightning;

  if (![5, 8, 10, 15].includes(questionCount)) {
    return NextResponse.json({ error: "questionCount must be 5, 8, 10, or 15" }, { status: 400 });
  }
  if (![15, 20, 30].includes(timerSeconds)) {
    return NextResponse.json({ error: "timerSeconds must be 15, 20, or 30" }, { status: 400 });
  }

  // Find questions already used by this pool (assigned to any round OR legacy queue entries)
  const usedRows = await db
    .select({ questionId: poolTriviaQueue.questionId })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));
  const usedIds = usedRows.map((r) => r.questionId);

  // Pull eligible questions
  const whereParts = [eq(triviaQuestions.active, true)];
  if (category) whereParts.push(eq(triviaQuestions.category, category));
  if (usedIds.length > 0) whereParts.push(notInArray(triviaQuestions.id, usedIds));

  const available = await db
    .select({ id: triviaQuestions.id })
    .from(triviaQuestions)
    .where(and(...whereParts))
    .orderBy(sql`random()`)
    .limit(questionCount);

  if (available.length < questionCount) {
    return NextResponse.json(
      {
        error: "Not enough unused questions",
        availableCount: available.length,
        requested: questionCount,
      },
      { status: 400 }
    );
  }

  // Compute next sort_order for this pool's rounds
  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(triviaRounds)
    .where(eq(triviaRounds.poolId, poolId));
  const nextSort = Number(maxRow?.max ?? 0) + 1;

  // Insert round
  const [round] = await db
    .insert(triviaRounds)
    .values({
      poolId,
      label,
      category,
      questionCount,
      timerSeconds,
      isLightning,
      pointMultiplier: isLightning ? 2 : 1,
      sortOrder: nextSort,
      status: "pending",
    })
    .returning();

  // Compute next queue sort_order for this pool
  const [maxQueueRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));
  const queueBase = Number(maxQueueRow?.max ?? 0);

  // Insert queue entries linking questions to the round
  const queueValues = available.map((q, i) => ({
    poolId,
    questionId: q.id,
    sortOrder: queueBase + i + 1,
    status: "pending" as const,
    roundId: round.id,
  }));

  await db.insert(poolTriviaQueue).values(queueValues);

  // Return created round + its questions
  const questions = await db
    .select({
      queueId: poolTriviaQueue.id,
      questionId: poolTriviaQueue.questionId,
      sortOrder: poolTriviaQueue.sortOrder,
      question: triviaQuestions.question,
      options: triviaQuestions.options,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
    })
    .from(poolTriviaQueue)
    .innerJoin(triviaQuestions, eq(poolTriviaQueue.questionId, triviaQuestions.id))
    .where(eq(poolTriviaQueue.roundId, round.id))
    .orderBy(asc(poolTriviaQueue.sortOrder));

  return NextResponse.json({ round, questions });
}
