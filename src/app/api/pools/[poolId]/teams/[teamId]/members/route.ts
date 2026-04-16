import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pools, poolTeams, poolTeamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { canManagePool } from "@/lib/pool-helpers";

async function verifyCommissioner(poolId: string, userId: string) {
  const canManage = await canManagePool(userId, poolId);
  if (!canManage) return { error: "Only commissioners can manage team members", status: 401 };
  return {};
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string; teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId, teamId } = await params;

  const check = await verifyCommissioner(poolId, session.user.id);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const team = await db.query.poolTeams.findFirst({ where: (t, { eq }) => eq(t.id, teamId) });
  if (!team || team.poolId !== poolId)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await db
    .insert(poolTeamMembers)
    .values({ poolTeamId: teamId, userId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string; teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId, teamId } = await params;

  const check = await verifyCommissioner(poolId, session.user.id);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await db
    .delete(poolTeamMembers)
    .where(and(eq(poolTeamMembers.poolTeamId, teamId), eq(poolTeamMembers.userId, userId)));

  return NextResponse.json({ ok: true });
}
