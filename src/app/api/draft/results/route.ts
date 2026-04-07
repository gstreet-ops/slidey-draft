import { NextRequest, NextResponse } from "next/server";
import { getActualResults } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const season = Number(req.nextUrl.searchParams.get("season") || "2026");
  const results = await getActualResults(season);
  return NextResponse.json(results);
}
