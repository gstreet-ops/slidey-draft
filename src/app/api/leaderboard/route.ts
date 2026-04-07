import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActualResults } from "@/lib/queries";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { groupMembers } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");
    const groupId = req.nextUrl.searchParams.get("groupId");

    let memberIds: string[] | undefined;
    if (groupId) {
      const members = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));
      memberIds = members.map((m) => m.userId);
    }

    const leaderboard = await getLeaderboard(season, memberIds);
    const results = await getActualResults(season);

    return NextResponse.json({
      leaderboard,
      picksScored: results.length,
      totalPicks: 32,
    });
  } catch (err) {
    console.error("[Leaderboard] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
