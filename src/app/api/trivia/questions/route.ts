import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, users } from "@/db/schema";
import { eq, and, sql, desc, ilike } from "drizzle-orm";

// GET /api/trivia/questions — list all active questions with optional filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty") as "easy" | "medium" | "hard" | null;
  const search = searchParams.get("search");
  const includeInactive = searchParams.get("includeInactive") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (!includeInactive) conditions.push(eq(triviaQuestions.active, true));
  if (category) conditions.push(eq(triviaQuestions.category, category));
  if (difficulty) conditions.push(eq(triviaQuestions.difficulty, difficulty));
  if (search) conditions.push(ilike(triviaQuestions.question, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [questions, countResult, categories] = await Promise.all([
    db
      .select({
        id: triviaQuestions.id,
        question: triviaQuestions.question,
        options: triviaQuestions.options,
        correctAnswer: triviaQuestions.correctAnswer,
        category: triviaQuestions.category,
        difficulty: triviaQuestions.difficulty,
        active: triviaQuestions.active,
        createdBy: triviaQuestions.createdBy,
        createdByName: users.name,
        createdByEmail: users.email,
        createdAt: triviaQuestions.createdAt,
      })
      .from(triviaQuestions)
      .leftJoin(users, eq(triviaQuestions.createdBy, users.id))
      .where(where)
      .orderBy(desc(triviaQuestions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(triviaQuestions).where(where),
    db
      .selectDistinct({ category: triviaQuestions.category })
      .from(triviaQuestions)
      .where(eq(triviaQuestions.active, true)),
  ]);

  return NextResponse.json({
    questions,
    total: Number(countResult[0].count),
    page,
    pages: Math.ceil(Number(countResult[0].count) / limit),
    categories: categories.map((c) => c.category),
  });
}

// POST /api/trivia/questions — create a new question (commissioner only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must be admin or commissioner
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { question, options, correctAnswer, category, difficulty } = await req.json();

  if (!question || !Array.isArray(options) || options.length !== 4 || correctAnswer == null || !category) {
    return NextResponse.json({ error: "Invalid question data" }, { status: 400 });
  }

  if (correctAnswer < 0 || correctAnswer > 3) {
    return NextResponse.json({ error: "correctAnswer must be 0-3" }, { status: 400 });
  }

  const diff = difficulty || "medium";
  if (!["easy", "medium", "hard"].includes(diff)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  const [created] = await db
    .insert(triviaQuestions)
    .values({
      question,
      options,
      correctAnswer,
      category,
      difficulty: diff,
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json({ question: created });
}
