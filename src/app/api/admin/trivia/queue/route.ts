import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions } from "@/db/schema";
import { eq, isNotNull, isNull, asc, sql, gt, gte, lte, and, lt } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = await db
    .select({
      id: triviaQuestions.id,
      question: triviaQuestions.question,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
      sortOrder: triviaQuestions.sortOrder,
      firedAt: triviaQuestions.firedAt,
    })
    .from(triviaQuestions)
    .where(isNotNull(triviaQuestions.sortOrder))
    .orderBy(asc(triviaQuestions.sortOrder));

  return NextResponse.json({ queue });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId, action, position } = await req.json();

  if (action === "add") {
    // Append to end of queue
    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(sort_order), 0)` })
      .from(triviaQuestions);
    const nextOrder = (maxRow?.max ?? 0) + 1;

    await db
      .update(triviaQuestions)
      .set({ sortOrder: nextOrder })
      .where(eq(triviaQuestions.id, questionId));

    return NextResponse.json({ success: true, sortOrder: nextOrder });
  }

  if (action === "remove") {
    // Get current position before removing
    const [q] = await db
      .select({ sortOrder: triviaQuestions.sortOrder })
      .from(triviaQuestions)
      .where(eq(triviaQuestions.id, questionId));

    if (q?.sortOrder != null) {
      // Remove from queue
      await db
        .update(triviaQuestions)
        .set({ sortOrder: null })
        .where(eq(triviaQuestions.id, questionId));

      // Shift down everything above the removed position
      await db.execute(sql`
        UPDATE trivia_questions
        SET sort_order = sort_order - 1
        WHERE sort_order > ${q.sortOrder}
      `);
    }

    return NextResponse.json({ success: true });
  }

  if (action === "reorder" && position != null) {
    const [q] = await db
      .select({ sortOrder: triviaQuestions.sortOrder })
      .from(triviaQuestions)
      .where(eq(triviaQuestions.id, questionId));

    if (q?.sortOrder == null) {
      return NextResponse.json({ error: "Question not in queue" }, { status: 400 });
    }

    const oldPos = q.sortOrder;
    const newPos = position;

    if (oldPos === newPos) {
      return NextResponse.json({ success: true });
    }

    if (newPos < oldPos) {
      // Moving up: shift items in [newPos, oldPos-1] down by 1
      await db.execute(sql`
        UPDATE trivia_questions
        SET sort_order = sort_order + 1
        WHERE sort_order >= ${newPos} AND sort_order < ${oldPos}
      `);
    } else {
      // Moving down: shift items in [oldPos+1, newPos] up by 1
      await db.execute(sql`
        UPDATE trivia_questions
        SET sort_order = sort_order - 1
        WHERE sort_order > ${oldPos} AND sort_order <= ${newPos}
      `);
    }

    await db
      .update(triviaQuestions)
      .set({ sortOrder: newPos })
      .where(eq(triviaQuestions.id, questionId));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionIds } = await req.json();

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: "questionIds array required" }, { status: 400 });
  }

  // Clear all existing sort_orders first, then set new ones
  await db.execute(sql`UPDATE trivia_questions SET sort_order = NULL WHERE sort_order IS NOT NULL`);

  for (let i = 0; i < questionIds.length; i++) {
    await db
      .update(triviaQuestions)
      .set({ sortOrder: i + 1 })
      .where(eq(triviaQuestions.id, questionIds[i]));
  }

  return NextResponse.json({ success: true, count: questionIds.length });
}
