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

  // Verify commissioner
  const pool = await db.query.pools.findFirst({
    where: (p, { eq }) => eq(p.id, poolId),
  });

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  if (pool.commissionerId !== session.user.id) {
    return NextResponse.json({ error: "Only the commissioner can change theme" }, { status: 403 });
  }

  const { primaryColor, secondaryColor } = await req.json();

  await db
    .update(pools)
    .set({
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      updatedAt: new Date(),
    })
    .where(eq(pools.id, poolId));

  return NextResponse.json({ success: true });
}
