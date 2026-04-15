import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { canManagePool } from "@/lib/pool-helpers";

// DELETE /api/pools/[poolId]/trivia/queue/[questionId] — remove pending question from queue
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId, questionId } = await params;
  if (!(await canManagePool(session.user.id, poolId)) && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [item] = await db
    .select()
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.questionId, questionId)));

  if (!item) return NextResponse.json({ error: "Not in queue" }, { status: 404 });
  if (item.status !== "pending") {
    return NextResponse.json({ error: "Only pending items can be removed" }, { status: 400 });
  }

  await db.delete(poolTriviaQueue).where(eq(poolTriviaQueue.id, item.id));

  // Shift down items after the removed position
  await db.execute(sql`
    UPDATE pool_trivia_queue
    SET sort_order = sort_order - 1
    WHERE pool_id = ${poolId} AND sort_order > ${item.sortOrder}
  `);

  return NextResponse.json({ success: true });
}
