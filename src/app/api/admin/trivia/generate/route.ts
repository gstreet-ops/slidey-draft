import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, difficulty, count, customTopic } = await req.json();

  const categoryLabel = category === "custom" && customTopic ? customTopic : category;
  const difficultyInstruction =
    difficulty === "mixed"
      ? "Mix of easy, medium, and hard questions"
      : `All questions should be ${difficulty} difficulty`;

  let message;
  try {
    const client = new Anthropic();
    message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Generate ${count} NFL Draft trivia questions about "${categoryLabel}".

${difficultyInstruction}.

Return ONLY a valid JSON array. Each object must have exactly these fields:
- "question": string (the question text)
- "options": array of exactly 4 strings (the answer choices)
- "correctAnswer": integer 0-3 (index of the correct answer in the options array)
- "category": "${category === "custom" ? "general" : category}"
- "difficulty": "${difficulty === "mixed" ? "medium" : difficulty}" (if mixed, vary between "easy", "medium", "hard")

Make questions factual and interesting. Avoid duplicating well-known #1 pick trivia. Include combine stats, trade details, draft day surprises, and lesser-known facts.

Return ONLY the JSON array, no markdown fences, no explanation.`,
        },
      ],
    });
  } catch (err: unknown) {
    const errObj = err as { status?: number; message?: string; error?: { type?: string; message?: string } };
    console.error("Anthropic API error:", {
      status: errObj.status,
      message: errObj.message,
      errorType: errObj.error?.type,
      errorMessage: errObj.error?.message,
      hasKey: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10),
    });
    const detail = errObj.error?.message || errObj.message || "Unknown error";
    return NextResponse.json(
      { error: `AI generation failed: ${detail}` },
      { status: 500 }
    );
  }

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  let questions;
  try {
    questions = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      questions = JSON.parse(match[0]);
    } else {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }
  }

  const valid = Array.isArray(questions) &&
    questions.every(
      (q: Record<string, unknown>) =>
        q.question &&
        Array.isArray(q.options) &&
        (q.options as unknown[]).length === 4 &&
        typeof q.correctAnswer === "number" &&
        q.correctAnswer >= 0 &&
        q.correctAnswer <= 3 &&
        q.category &&
        q.difficulty
    );

  if (!valid) {
    return NextResponse.json(
      { error: "Generated questions failed validation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ questions });
}
