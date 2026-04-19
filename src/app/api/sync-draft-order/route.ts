import { NextResponse, type NextRequest } from "next/server";
import { syncDraftOrder } from "@/lib/draft-order-sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.SYNC_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SYNC_SECRET is not configured" },
      { status: 500 }
    );
  }

  const provided =
    req.headers.get("x-sync-secret") ||
    new URL(req.url).searchParams.get("secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const seasonParam = new URL(req.url).searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : 2026;
  if (!Number.isInteger(season) || season < 2020 || season > 2100) {
    return NextResponse.json({ ok: false, error: "Invalid season" }, { status: 400 });
  }

  const summary = await syncDraftOrder(season);
  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 502,
  });
}
