import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { picks, players, pickScores } from "@/db/schema";

type Params = Promise<{ boardId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { boardId } = await params;

    const boardPicks = await db
      .select({
        pickNumber: picks.pickNumber,
        playerName: players.name,
        playerPosition: players.position,
        autoFilled: picks.autoFilled,
      })
      .from(picks)
      .innerJoin(players, eq(picks.playerId, players.id))
      .where(eq(picks.boardId, boardId))
      .orderBy(asc(picks.pickNumber));

    const scores = await db
      .select({
        pickNumber: pickScores.pickNumber,
        pointsAwarded: pickScores.pointsAwarded,
        matchType: pickScores.matchType,
      })
      .from(pickScores)
      .where(eq(pickScores.boardId, boardId))
      .orderBy(asc(pickScores.pickNumber));

    return NextResponse.json({ picks: boardPicks, scores });
  } catch (err) {
    console.error("[Board Live] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
