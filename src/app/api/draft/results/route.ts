import { NextRequest, NextResponse } from "next/server";
import { getActualResults } from "@/lib/queries";

export async function GET(req: NextRequest) {
  try {
    const season = Number(req.nextUrl.searchParams.get("season") || "2026");
    const results = await getActualResults(season);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[Draft Results] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
