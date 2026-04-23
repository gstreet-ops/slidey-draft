import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaCategories, triviaQuestions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// POST /api/trivia/categories/merge — reassign all questions from sourceId to targetId, then delete source
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sourceId, targetId } = await req.json().catch(() => ({}));

  if (!sourceId || !targetId || typeof sourceId !== "string" || typeof targetId !== "string") {
    return NextResponse.json({ error: "sourceId and targetId are required" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "sourceId and targetId must differ" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(triviaCategories)
    .where(sql`${triviaCategories.id} IN (${sourceId}, ${targetId})`);

  const source = rows.find((r) => r.id === sourceId);
  const target = rows.find((r) => r.id === targetId);

  if (!source || !target) {
    return NextResponse.json({ error: "Source or target category not found" }, { status: 404 });
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(triviaQuestions)
    .where(eq(triviaQuestions.category, source.name));
  const moved = Number(countRow?.count ?? 0);

  if (moved > 0) {
    await db
      .update(triviaQuestions)
      .set({ category: target.name })
      .where(eq(triviaQuestions.category, source.name));
  }

  await db.delete(triviaCategories).where(eq(triviaCategories.id, source.id));

  return NextResponse.json({
    ok: true,
    moved,
    source: source.name,
    target: target.name,
  });
}
