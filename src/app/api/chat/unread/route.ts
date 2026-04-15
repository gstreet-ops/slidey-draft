import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolMembers, chatMessages } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the latest message timestamp per pool the user belongs to
  const userPoolIds = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .where(eq(poolMembers.userId, session.user.id));

  if (userPoolIds.length === 0) {
    return NextResponse.json({ pools: [] });
  }

  const ids = userPoolIds.map((p) => p.poolId);

  const latest = await db
    .select({
      poolId: chatMessages.poolId,
      latestMessageAt: sql<string>`max(${chatMessages.createdAt})`.as("latest_message_at"),
    })
    .from(chatMessages)
    .where(inArray(chatMessages.poolId, ids))
    .groupBy(chatMessages.poolId);

  return NextResponse.json({
    pools: latest.map((r) => ({
      poolId: r.poolId,
      latestMessageAt: r.latestMessageAt,
    })),
  });
}
