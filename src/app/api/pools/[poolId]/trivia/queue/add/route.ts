import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { canManagePool } from "@/lib/pool-helpers";

// POST /api/pools/[poolId]/trivia/queue/add — append a single question to the queue
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  if (!(await canManagePool(session.user.id, poolId)) && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionId } = await req.json();
  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  // Get next sort_order
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(sort_order), 0)` })
    .from(poolTriviaQueue)
    .where(eq(poolTriviaQueue.poolId, poolId));
  const nextOrder = (maxRow?.max ?? 0) + 1;

  await db
    .insert(poolTriviaQueue)
    .values({
      poolId,
      questionId,
      sortOrder: nextOrder,
      status: "pending",
    })
    .onConflictDoNothing();

  return NextResponse.json({ success: true, sortOrder: nextOrder });
}
