import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await req.json();

  // Allow null to clear (reset to default).
  if (teamId === null) {
    await db
      .update(users)
      .set({ favoriteTeamId: null })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ favoriteTeam: null });
  }

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, teamId),
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await db
    .update(users)
    .set({ favoriteTeamId: teamId })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({
    favoriteTeam: {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      logoUrl: team.logoUrl,
    },
  });
}
