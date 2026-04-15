import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions } from "@/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questions } = await req.json();

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "No questions provided" }, { status: 400 });
  }

  const rows = questions.map((q: Record<string, unknown>) => ({
    question: q.question as string,
    options: q.options as string[],
    correctAnswer: q.correctAnswer as number,
    category: q.category as string,
    difficulty: (q.difficulty as "easy" | "medium" | "hard") || "medium",
    createdBy: session.user!.id,
  }));

  await db.insert(triviaQuestions).values(rows);

  return NextResponse.json({ saved: rows.length });
}
