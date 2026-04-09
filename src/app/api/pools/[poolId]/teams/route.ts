import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pools, poolTeams, poolTeamMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  const teams = await db.query.poolTeams.findMany({
    where: (t, { eq }) => eq(t.poolId, poolId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const teamsWithMembers = await Promise.all(
    teams.map(async (team) => {
      const members = await db
        .select({ userId: poolTeamMembers.userId, userName: users.name })
        .from(poolTeamMembers)
        .leftJoin(users, eq(users.id, poolTeamMembers.userId))
        .where(eq(poolTeamMembers.poolTeamId, team.id));

      return {
        id: team.id,
        name: team.name,
        colorHex: team.colorHex,
        members: members.map((m) => ({ userId: m.userId, userName: m.userName ?? "" })),
      };
    })
  );

  return NextResponse.json({ teams: teamsWithMembers });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;

  const pool = await db.query.pools.findFirst({ where: (p, { eq }) => eq(p.id, poolId) });
  if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  if (pool.commissionerId !== session.user.id)
    return NextResponse.json({ error: "Only the commissioner can manage teams" }, { status: 401 });

  const { name, colorHex } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Team name required" }, { status: 400 });

  const [team] = await db
    .insert(poolTeams)
    .values({ poolId, name: name.trim(), colorHex: colorHex ?? "#4A7AB5" })
    .returning();

  return NextResponse.json({ team });
}
