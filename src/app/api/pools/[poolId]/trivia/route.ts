import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses, pools } from "@/db/schema";
import { eq, notInArray, sql, isNotNull, desc } from "drizzle-orm";
import { getPoolSettings } from "@/lib/pool-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  // Get pool timer settings
  const [pool] = await db.select({ settings: pools.settings }).from(pools).where(eq(pools.id, poolId));
  const settings = getPoolSettings(pool?.settings);
  const defaultTimer = settings.triviaTimerSeconds ?? 30;

  // Check for a currently live (fired) question the user hasn't answered
  const answered = await db
    .select({ questionId: triviaResponses.questionId })
    .from(triviaResponses)
    .where(sql`${triviaResponses.userId} = ${session.user.id} AND ${triviaResponses.poolId} = ${poolId}`);
  const answeredIds = answered.map((a) => a.questionId);

  // Look for the most recently fired question that the user hasn't answered
  const firedQuestions = await db
    .select()
    .from(triviaQuestions)
    .where(isNotNull(triviaQuestions.firedAt))
    .orderBy(desc(triviaQuestions.firedAt))
    .limit(1);

  if (firedQuestions.length > 0) {
    const q = firedQuestions[0];
    const timerSec = q.timerSeconds ?? defaultTimer;
    const firedAt = q.firedAt!.getTime();
    const expiresAt = firedAt + timerSec * 1000;
    const now = Date.now();

    // If question is still live and user hasn't answered it
    if (now < expiresAt && !answeredIds.includes(q.id)) {
      return NextResponse.json({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        category: q.category,
        difficulty: q.difficulty,
        timerSeconds: timerSec,
        expiresAt,
        live: true,
      });
    }
  }

  // Fallback: return a random unanswered question (self-serve mode / pre-draft)
  const questions = await db
    .select()
    .from(triviaQuestions)
    .where(answeredIds.length > 0 ? notInArray(triviaQuestions.id, answeredIds) : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (questions.length === 0) {
    return NextResponse.json({ noMoreQuestions: true });
  }

  const q = questions[0];
  return NextResponse.json({
    id: q.id,
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    category: q.category,
    difficulty: q.difficulty,
    timerSeconds: defaultTimer,
    live: false,
  });
}
