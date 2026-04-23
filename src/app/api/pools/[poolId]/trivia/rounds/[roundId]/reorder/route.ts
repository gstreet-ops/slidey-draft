import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaRounds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// PUT /api/pools/[poolId]/trivia/rounds/[roundId]/reorder — set sortOrder
export async function PUT(
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

  const { sortOrder } = await req.json();
  if (typeof sortOrder !== "number") {
    return NextResponse.json({ error: "sortOrder (number) required" }, { status: 400 });
  }

  await db
    .update(triviaRounds)
    .set({ sortOrder })
    .where(and(eq(triviaRounds.id, roundId), eq(triviaRounds.poolId, poolId)));

  return NextResponse.json({ success: true });
}
