import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { livePredictions, players, actualResults } from "@/db/schema";
import { eq, and, notInArray, asc, isNotNull } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { poolId } = await params;
  const { pickNumber } = await req.json();

  // Check if prediction already exists
  const existing = await db.query.livePredictions.findFirst({
    where: (lp, { eq, and }) => and(
      eq(lp.poolId, poolId),
      eq(lp.userId, session.user.id),
      eq(lp.pickNumber, pickNumber)
    ),
  });

  if (existing) {
    return NextResponse.json({ alreadyPredicted: true });
  }

  // Get already-drafted player IDs from actual results
  const drafted = await db.select({ playerId: actualResults.playerId })
    .from(actualResults).where(eq(actualResults.season, 2026));
  const draftedIds = drafted.map(d => d.playerId);

  // Get BPA (highest ranked available player)
  const bpa = await db.select({ id: players.id, name: players.name })
    .from(players)
    .where(and(
      isNotNull(players.rank),
      draftedIds.length > 0 ? notInArray(players.id, draftedIds) : undefined
    ))
    .orderBy(asc(players.rank))
    .limit(1);

  if (bpa.length === 0) {
    return NextResponse.json({ error: "No players available" }, { status: 400 });
  }

  await db.insert(livePredictions).values({
    poolId,
    userId: session.user.id,
    pickNumber,
    predictedPlayerId: bpa[0].id,
    isAutoFilled: true,
  }).onConflictDoNothing();

  return NextResponse.json({ autoFilled: true, playerName: bpa[0].name });
}
