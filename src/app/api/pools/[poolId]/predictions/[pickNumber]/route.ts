import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { livePredictions, liveScores, actualResults, poolMembers, players, users } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string; pickNumber: string }> }
) {
  try {
    const { poolId, pickNumber: pickNumberStr } = await params;
    const pickNumber = parseInt(pickNumberStr);
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify membership
    const [membership] = await db
      .select()
      .from(poolMembers)
      .where(
        and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, session.user.id))
      );
    if (!membership) {
      return NextResponse.json({ error: "Not a pool member" }, { status: 403 });
    }

    // Check if pick has been announced
    const [result] = await db
      .select()
      .from(actualResults)
      .where(
        and(eq(actualResults.season, 2026), eq(actualResults.pickNumber, pickNumber))
      );

    if (!result) {
      // Pick not yet announced — only return the current user's prediction
      const [myPred] = await db
        .select({
          predictedPlayerId: livePredictions.predictedPlayerId,
          playerName: players.name,
          playerPosition: players.position,
          playerSchool: players.school,
        })
        .from(livePredictions)
        .innerJoin(players, eq(livePredictions.predictedPlayerId, players.id))
        .where(
          and(
            eq(livePredictions.poolId, poolId),
            eq(livePredictions.userId, session.user.id),
            eq(livePredictions.pickNumber, pickNumber)
          )
        );

      return NextResponse.json({
        announced: false,
        myPrediction: myPred || null,
        predictions: [],
      });
    }

    // Pick announced — return all predictions with scores
    const allPredictions = await db
      .select({
        userId: livePredictions.userId,
        predictedPlayerId: livePredictions.predictedPlayerId,
        playerName: players.name,
        playerPosition: players.position,
        userName: users.name,
        userEmail: users.email,
      })
      .from(livePredictions)
      .innerJoin(players, eq(livePredictions.predictedPlayerId, players.id))
      .innerJoin(users, eq(livePredictions.userId, users.id))
      .where(
        and(
          eq(livePredictions.poolId, poolId),
          eq(livePredictions.pickNumber, pickNumber)
        )
      );

    // Get scores for this pick
    const scoreRows = await db
      .select()
      .from(liveScores)
      .where(
        and(eq(liveScores.poolId, poolId), eq(liveScores.pickNumber, pickNumber))
      );

    const scoreMap = new Map(scoreRows.map((s) => [s.userId, s]));

    const predictions = allPredictions.map((p) => ({
      ...p,
      correct: scoreMap.get(p.userId)?.correct ?? false,
      pointsAwarded: scoreMap.get(p.userId)?.pointsAwarded ?? 0,
    }));

    const correctCount = predictions.filter((p) => p.correct).length;

    return NextResponse.json({
      announced: true,
      actualPlayerId: result.playerId,
      predictions,
      correctCount,
      totalPredictions: predictions.length,
    });
  } catch (error) {
    console.error("Predictions error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
