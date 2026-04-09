import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, triviaResponses } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const { questionId, selectedOption } = await req.json();

  if (!questionId || !selectedOption) {
    return NextResponse.json({ error: "questionId and selectedOption required" }, { status: 400 });
  }

  const question = await db.query.triviaQuestions.findFirst({
    where: (q, { eq }) => eq(q.id, questionId),
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const isCorrect = selectedOption === question.correctOption;
  const pointsAwarded = isCorrect ? 5 : 0;

  await db
    .insert(triviaResponses)
    .values({
      poolId,
      userId: session.user.id,
      questionId,
      selectedOption,
      isCorrect,
      pointsAwarded,
    })
    .onConflictDoNothing();

  return NextResponse.json({
    correct: isCorrect,
    correctOption: question.correctOption,
    pointsAwarded,
  });
}
