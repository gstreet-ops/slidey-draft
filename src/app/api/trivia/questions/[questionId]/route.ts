import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/trivia/questions/[questionId] — edit a question (admin or commissioner).
// Commissioners may now edit ANY question in the bank, including system-seeded ones.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionId } = await params;

  const [existing] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, questionId));

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.question !== undefined) {
    if (typeof body.question !== "string" || !body.question.trim()) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 });
    }
    updates.question = body.question;
  }

  if (body.options !== undefined) {
    if (
      !Array.isArray(body.options) ||
      body.options.length !== 4 ||
      body.options.some((o: unknown) => typeof o !== "string" || !o.trim())
    ) {
      return NextResponse.json({ error: "options must be 4 non-empty strings" }, { status: 400 });
    }
    updates.options = body.options;
  }

  if (body.correctAnswer !== undefined) {
    const idx = Number(body.correctAnswer);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return NextResponse.json({ error: "correctAnswer must be 0-3" }, { status: 400 });
    }
    updates.correctAnswer = idx;
  }

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !body.category.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    updates.category = body.category;
  }

  if (body.difficulty !== undefined) {
    if (!["easy", "medium", "hard"].includes(body.difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }
    updates.difficulty = body.difficulty;
  }

  if (body.active !== undefined) {
    updates.active = !!body.active;
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
