import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, pools, actualResults } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

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

  const { questionId, timerSeconds } = await req.json();

  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  // Get current pick number from actual results
  const [latestPick] = await db
    .select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, 2026))
    .orderBy(sql`pick_number DESC`)
    .limit(1);

  const currentPick = latestPick?.pickNumber ?? 0;

  // Mark question as fired
  await db
    .update(triviaQuestions)
    .set({
      firedAt: new Date(),
      firedBy: session.user.id,
      pickNumber: currentPick,
      ...(timerSeconds ? { timerSeconds } : {}),
    })
    .where(eq(triviaQuestions.id, questionId));

  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, questionId));

  // Get pool timer setting as fallback
  const [pool] = await db.select({ settings: pools.settings }).from(pools).where(eq(pools.id, poolId));
  const poolSettings = pool?.settings as Record<string, unknown> | null;
  const effectiveTimer = timerSeconds ?? question?.timerSeconds ?? (poolSettings?.triviaTimerSeconds as number) ?? 30;

  return NextResponse.json({
    success: true,
    question: question
      ? {
          id: question.id,
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          category: question.category,
          difficulty: question.difficulty,
          firedAt: question.firedAt,
          pickNumber: currentPick,
        }
      : null,
    timerSeconds: effectiveTimer,
  });
}
