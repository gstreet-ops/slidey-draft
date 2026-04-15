import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pools, poolMembers } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admins see all pools; others see pools they're a member of or commissioner of
  let result;
  if (session.user.role === "admin") {
    result = await db
      .select({ id: pools.id, name: pools.name })
      .from(pools);
  } else {
    result = await db
      .selectDistinct({ id: pools.id, name: pools.name })
      .from(pools)
      .leftJoin(poolMembers, eq(pools.id, poolMembers.poolId))
      .where(
        or(
          eq(pools.commissionerId, session.user.id),
          eq(poolMembers.userId, session.user.id)
        )
      );
  }

  return NextResponse.json({ pools: result });
}
