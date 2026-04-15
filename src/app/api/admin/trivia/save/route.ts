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

  const rows = questions.map((q: Record<string, string>) => ({
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption: q.correctOption,
    category: q.category,
    difficulty: q.difficulty,
  }));

  await db.insert(triviaQuestions).values(rows);

  return NextResponse.json({ saved: rows.length });
}
