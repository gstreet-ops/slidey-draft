import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActualResults } from "@/lib/queries";

export async function GET(req: NextRequest) {
  try {
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");

    const leaderboard = await getLeaderboard(season);
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
