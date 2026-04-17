import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActualResults, getPoolMembers } from "@/lib/queries";
import { getCached, setCache } from "@/lib/cache";

const CACHE_TTL = 5_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> },
) {
  try {
    const { poolId } = await params;
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");
    const cacheKey = `leaderboard:${poolId}:${season}`;

    const cached = getCached<{ leaderboard: unknown; picksScored: number; totalPicks: number }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const members = await getPoolMembers(poolId);
    const memberIds = members.map((m) => m.userId);

    const [leaderboard, results] = await Promise.all([
      getLeaderboard(season, memberIds),
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
    console.error("[PoolLeaderboard] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
