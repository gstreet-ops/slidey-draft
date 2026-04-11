import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActualResults } from "@/lib/queries";
import { getCached, setCache } from "@/lib/cache";

const CACHE_TTL = 5_000; // 5 seconds — scores update at most every 30s from ESPN sync

export async function GET(req: NextRequest) {
  try {
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");
    const cacheKey = `leaderboard:${season}`;

    const cached = getCached<{ leaderboard: unknown; picksScored: number; totalPicks: number }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const [leaderboard, results] = await Promise.all([
      getLeaderboard(season),
      getActualResults(season),
    ]);

    const response = {
      leaderboard,
      picksScored: results.length,
      totalPicks: 32,
    };

    setCache(cacheKey, response, CACHE_TTL);

    return NextResponse.json(response);
  } catch (err) {
    console.error("[Leaderboard] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
