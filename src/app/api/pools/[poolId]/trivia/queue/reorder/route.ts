import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolTriviaQueue } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { canManagePool } from "@/lib/pool-helpers";

// PUT /api/pools/[poolId]/trivia/queue/reorder — { questionId, newSortOrder }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  if (!(await canManagePool(session.user.id, poolId)) && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionId, newSortOrder } = await req.json();
  if (!questionId || !newSortOrder) {
    return NextResponse.json({ error: "questionId and newSortOrder required" }, { status: 400 });
  }

  // Find the current queue item
  const [item] = await db
    .select()
    .from(poolTriviaQueue)
    .where(and(eq(poolTriviaQueue.poolId, poolId), eq(poolTriviaQueue.questionId, questionId)));

  if (!item) return NextResponse.json({ error: "Not in queue" }, { status: 404 });
  if (item.status !== "pending") return NextResponse.json({ error: "Only pending items can be reordered" }, { status: 400 });

  const oldPos = item.sortOrder;
  const newPos = newSortOrder;
  if (oldPos === newPos) return NextResponse.json({ success: true });

  // Temporarily set to a high value to avoid unique constraint
  await db
    .update(poolTriviaQueue)
    .set({ sortOrder: 999999 })
    .where(eq(poolTriviaQueue.id, item.id));

  if (newPos < oldPos) {
    // Moving up: shift items in [newPos, oldPos-1] down by 1
    await db.execute(sql`
      UPDATE pool_trivia_queue
      SET sort_order = sort_order + 1
      WHERE pool_id = ${poolId}
        AND sort_order >= ${newPos} AND sort_order < ${oldPos}
        AND status = 'pending'
    `);
  } else {
    // Moving down: shift items in [oldPos+1, newPos] up by 1
    await db.execute(sql`
      UPDATE pool_trivia_queue
      SET sort_order = sort_order - 1
      WHERE pool_id = ${poolId}
        AND sort_order > ${oldPos} AND sort_order <= ${newPos}
        AND status = 'pending'
    `);
  }

  await db
    .update(poolTriviaQueue)
    .set({ sortOrder: newPos })
    .where(eq(poolTriviaQueue.id, item.id));

  return NextResponse.json({ success: true });
}
