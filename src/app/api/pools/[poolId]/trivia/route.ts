import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses } from "@/db/schema";
import { eq, notInArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  // Get questions this user already answered in this pool
  const answered = await db
    .select({ questionId: triviaResponses.questionId })
    .from(triviaResponses)
    .where(eq(triviaResponses.userId, session.user.id));
  const answeredIds = answered.map((a) => a.questionId);

  // Find next unanswered question
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
  });
}
