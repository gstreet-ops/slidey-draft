import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Generate ${count} NFL Draft trivia questions about "${categoryLabel}".

${difficultyInstruction}.

Return ONLY a valid JSON array. Each object must have exactly these fields:
- "question": string (the question text)
- "optionA": string
- "optionB": string
- "optionC": string
- "optionD": string
- "correctOption": one of "a", "b", "c", "d"
- "category": "${category === "custom" ? "general" : category}"
- "difficulty": "${difficulty === "mixed" ? "medium" : difficulty}" (if mixed, vary between "easy", "medium", "hard")

Make questions factual and interesting. Avoid duplicating well-known #1 pick trivia. Include combine stats, trade details, draft day surprises, and lesser-known facts.

Return ONLY the JSON array, no markdown fences, no explanation.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  let questions;
  try {
    questions = JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown fences
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

  // Validate shape
  const valid = Array.isArray(questions) &&
    questions.every(
      (q: Record<string, unknown>) =>
        q.question &&
        q.optionA &&
        q.optionB &&
        q.optionC &&
        q.optionD &&
        ["a", "b", "c", "d"].includes(q.correctOption as string) &&
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
