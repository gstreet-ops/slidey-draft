import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { livePredictions, actualResults, poolMembers, pools } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getPoolSettings } from "@/lib/pool-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.user.status !== "active") {
      return NextResponse.json({ error: "Account not active" }, { status: 403 });
    }

    const { pickNumber, playerId } = await request.json();
    if (!pickNumber || !playerId) {
      return NextResponse.json({ error: "Missing pickNumber or playerId" }, { status: 400 });
    }

    // Verify pool membership
    const [membership] = await db
      .select()
      .from(poolMembers)
      .where(
        and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, session.user.id))
      );
    if (!membership) {
      return NextResponse.json({ error: "Not a pool member" }, { status: 403 });
    }

    // Verify pool has live predictions enabled
    const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }
    const settings = getPoolSettings(pool.settings);
    if (!settings.livePredictions) {
      return NextResponse.json({ error: "Live predictions disabled for this pool" }, { status: 400 });
    }

    // Verify pick hasn't been announced yet
    const [result] = await db
      .select()
      .from(actualResults)
      .where(
        and(eq(actualResults.season, 2026), eq(actualResults.pickNumber, pickNumber))
      );
    if (result) {
      return NextResponse.json({ error: "Pick already announced" }, { status: 400 });
    }

    // Check if user already predicted this pick
    const [existing] = await db
      .select()
      .from(livePredictions)
      .where(
        and(
          eq(livePredictions.poolId, poolId),
          eq(livePredictions.userId, session.user.id),
          eq(livePredictions.pickNumber, pickNumber)
        )
      );
    if (existing) {
      return NextResponse.json({ error: "Already predicted this pick" }, { status: 400 });
    }

    const [prediction] = await db
      .insert(livePredictions)
      .values({
        poolId,
        userId: session.user.id,
        pickNumber,
        predictedPlayerId: playerId,
      })
      .returning();

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
