import { NextRequest, NextResponse } from "next/server";
import { getActualResults } from "@/lib/queries";
import { getCached, setCache } from "@/lib/cache";

const CACHE_TTL = 10_000; // 10 seconds — results only change when sync job runs

export async function GET(req: NextRequest) {
  try {
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");
    const cacheKey = `draft-results:${season}`;

    const cached = getCached<unknown>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const results = await getActualResults(season);
    setCache(cacheKey, results, CACHE_TTL);

    return NextResponse.json(results);
  } catch (err) {
    console.error("[Draft Results] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
