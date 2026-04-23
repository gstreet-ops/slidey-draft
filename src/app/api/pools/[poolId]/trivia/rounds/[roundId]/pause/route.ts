import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaRounds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/rounds/[roundId]/pause — pause an active round
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
  if (round.status !== "active") {
    return NextResponse.json({ error: `Cannot pause round in status ${round.status}` }, { status: 400 });
  }

  await db
    .update(triviaRounds)
    .set({ status: "paused", pausedAt: new Date() })
    .where(eq(triviaRounds.id, roundId));

  return NextResponse.json({ success: true });
}
