import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaRounds, poolTriviaQueue } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/rounds/[roundId]/skip — abandon the round
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string; roundId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId, roundId } = await params;
  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [round] = await db
    .select()
    .from(triviaRounds)
    .where(and(eq(triviaRounds.id, roundId), eq(triviaRounds.poolId, poolId)));

  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  if (round.status === "completed") {
    return NextResponse.json({ error: "Round already completed" }, { status: 400 });
  }

  // Mark all non-completed queue entries for this round as completed
  await db
    .update(poolTriviaQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(poolTriviaQueue.roundId, roundId), ne(poolTriviaQueue.status, "completed")));

  await db
    .update(triviaRounds)
    .set({ status: "completed", completedAt: new Date(), pausedAt: null })
    .where(eq(triviaRounds.id, roundId));

  return NextResponse.json({ success: true });
}
