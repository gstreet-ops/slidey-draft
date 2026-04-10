import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { poolId } = await params;

  const pool = await db.query.pools.findFirst({
    where: (p, { eq }) => eq(p.id, poolId),
  });

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  if (pool.commissionerId !== session.user.id) {
    return NextResponse.json({ error: "Only the commissioner can lock/unlock" }, { status: 403 });
  }

  const { status } = await req.json();

  if (status !== "open" && status !== "locked") {
    return NextResponse.json({ error: "Status must be 'open' or 'locked'" }, { status: 400 });
  }

  await db
    .update(pools)
    .set({ status, updatedAt: new Date() })
    .where(eq(pools.id, poolId));

  return NextResponse.json({ success: true, status });
}
