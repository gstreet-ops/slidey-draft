import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBoardWithPicks } from "@/lib/queries";
import { draftBoards } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { gradeMockDraft } from "@/lib/mock-grading";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boardId = req.nextUrl.searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json({ error: "boardId required" }, { status: 400 });
  }

  const [board] = await db
    .select({ createdBy: draftBoards.createdBy, status: draftBoards.status })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  if (board.createdBy !== session.user.id && board.status !== "published") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const boardData = await getBoardWithPicks(boardId);
  if (!boardData || boardData.picks.length === 0) {
    return NextResponse.json({ error: "No picks to grade" }, { status: 400 });
  }

  const grade = gradeMockDraft(
    boardData.picks.map((p) => ({
      pickNumber: p.pickNumber,
      playerGrade: p.playerGrade,
      playerRank: p.playerRank,
    }))
  );

  const pickPositions = boardData.picks.map((p) => ({
    position: p.playerPosition,
  }));

  return NextResponse.json({ ...grade, pickPositions });
}
