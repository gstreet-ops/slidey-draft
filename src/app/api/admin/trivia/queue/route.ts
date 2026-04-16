import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions } from "@/db/schema";
import { desc } from "drizzle-orm";

// GET /api/admin/trivia/queue — legacy: returns all questions (queue is now per-pool)
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questions = await db
    .select()
    .from(triviaQuestions)
    .orderBy(desc(triviaQuestions.createdAt));

  return NextResponse.json({ queue: questions });
}
