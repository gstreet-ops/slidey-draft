import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (category) conditions.push(eq(triviaQuestions.category, category));
  if (difficulty) conditions.push(eq(triviaQuestions.difficulty, difficulty));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [questions, countResult] = await Promise.all([
    db
      .select()
      .from(triviaQuestions)
      .where(where)
      .orderBy(desc(triviaQuestions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(triviaQuestions)
      .where(where),
  ]);

  const total = Number(countResult[0].count);

  return NextResponse.json({
    questions,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  await db.delete(triviaQuestions).where(eq(triviaQuestions.id, id));

  return NextResponse.json({ deleted: true });
}
