import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { players, picks, draftBoards } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { computeAllRanges } from "@/lib/consensus-range";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Fetch all ranked players
  const allPlayers = await db
    .select({ id: players.id, rank: players.rank, grade: players.grade, position: players.position })
    .from(players)
    .where(sql`${players.rank} IS NOT NULL`)
    .orderBy(asc(players.rank));

  // Fetch all picks from published boards
  const mockPicks = await db
    .select({ playerId: picks.playerId, pickNumber: picks.pickNumber })
    .from(picks)
    .innerJoin(draftBoards, eq(picks.boardId, draftBoards.id))
    .where(eq(draftBoards.status, "published"));

  const ranges = computeAllRanges(allPlayers, mockPicks);

  let updated = 0;
  for (const [playerId, range] of ranges) {
    await db
      .update(players)
      .set({
        consensusLow: range.low,
        consensusHigh: range.high,
        consensusMid: range.mid,
      })
      .where(eq(players.id, playerId));
    updated++;
  }

  return NextResponse.json({ updated, total: allPlayers.length });
}
