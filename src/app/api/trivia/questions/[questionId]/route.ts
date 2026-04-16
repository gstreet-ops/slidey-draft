import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/trivia/questions/[questionId] — edit a question (only if created_by = current user)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;

  const [existing] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, questionId));

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // System-seeded questions (createdBy = null) can only be deactivated, not edited
  // Commissioner-created questions can only be edited by their creator (or site admin)
  if (existing.createdBy && existing.createdBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Cannot edit another user's question" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // System-seeded questions: only allow toggling active
  if (!existing.createdBy) {
    if (body.active !== undefined) updates.active = !!body.active;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "System questions can only be activated/deactivated" }, { status: 400 });
    }
  } else {
    if (body.question !== undefined) updates.question = body.question;
    if (body.options !== undefined) updates.options = body.options;
    if (body.correctAnswer !== undefined) updates.correctAnswer = body.correctAnswer;
    if (body.category !== undefined) updates.category = body.category;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.active !== undefined) updates.active = body.active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const [updated] = await db
    .update(triviaQuestions)
    .set(updates)
    .where(eq(triviaQuestions.id, questionId))
    .returning();

  return NextResponse.json({ question: updated });
}
