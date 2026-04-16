import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canManagePool } from "@/lib/pool-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { poolId } = await params;

  if (!(await canManagePool(session.user.id, poolId))) {
    return NextResponse.json({ error: "Only commissioners can change theme" }, { status: 403 });
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
