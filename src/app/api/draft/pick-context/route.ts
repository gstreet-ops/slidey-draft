import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { picks, players, draftBoards, users, pickScores } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const pickNumber = Number(req.nextUrl.searchParams.get("pickNumber") || "0");
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");

    if (!pickNumber) {
      return NextResponse.json({ error: "pickNumber required" }, { status: 400 });
    }

    // Get all published/locked boards' picks for this pick number, plus their scores
    const rows = await db
      .select({
        userName: users.name,
        userEmail: users.email,
        playerName: players.name,
        playerPosition: players.position,
        pickNumber: picks.pickNumber,
        matchType: pickScores.matchType,
        pointsAwarded: pickScores.pointsAwarded,
      })
      .from(picks)
      .innerJoin(draftBoards, eq(picks.boardId, draftBoards.id))
      .innerJoin(players, eq(picks.playerId, players.id))
      .leftJoin(users, eq(draftBoards.createdBy, users.id))
      .leftJoin(
        pickScores,
        and(
          eq(pickScores.boardId, picks.boardId),
          eq(pickScores.pickNumber, picks.pickNumber)
        )
      )
      .where(
        and(
          eq(picks.pickNumber, pickNumber),
          eq(draftBoards.season, season)
        )
      );

    const filtered = rows.filter(
      (r) => true // all boards with this pick number
    );

    const context = filtered.map((r) => ({
      userName: r.userName || r.userEmail || "Anonymous",
      playerName: r.playerName,
      playerPosition: r.playerPosition,
      matchType: r.matchType,
      pointsAwarded: r.pointsAwarded,
    }));

    return NextResponse.json({ pickNumber, context });
  } catch (err) {
    console.error("[Pick Context] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
