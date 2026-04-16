import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/skip — skip current active question, advance to next
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Mark active question as completed (skipped)
  const [active] = await db
    .select()
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.status, "active")));

  if (active) {
    await db
      .update(poolTriviaQueue)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(poolTriviaQueue.id, active.id));
  }

  return NextResponse.json({ success: true, skippedSortOrder: active?.sortOrder ?? null });
}
