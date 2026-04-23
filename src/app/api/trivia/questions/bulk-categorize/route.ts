import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaCategories, triviaQuestions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// PUT /api/trivia/questions/bulk-categorize — update many questions to a single category
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionIds, category } = await req.json().catch(() => ({}));

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: "questionIds must be a non-empty array" }, { status: 400 });
  }
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (!questionIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "questionIds must be strings" }, { status: 400 });
  }

  // Verify the target category exists in the master list so we don't create drift.
  const [match] = await db
    .select({ name: triviaCategories.name })
    .from(triviaCategories)
    .where(eq(triviaCategories.name, category.trim()))
    .limit(1);

  if (!match) {
    return NextResponse.json({ error: "Category is not in the master list" }, { status: 400 });
  }

  const updated = await db
    .update(triviaQuestions)
    .set({ category: match.name })
    .where(inArray(triviaQuestions.id, questionIds))
    .returning({ id: triviaQuestions.id });

  return NextResponse.json({ updated: updated.length, category: match.name });
}
