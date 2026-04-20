import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshRanks } from "@/db/update-espn-ranks";
import { getConfig } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

const RATE_LIMIT_MS = 60 * 60 * 1000;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const lastIso = await getConfig("ranks_last_fetched");
  if (lastIso) {
    const lastMs = new Date(lastIso).getTime();
    const elapsed = Date.now() - lastMs;
    if (!Number.isNaN(lastMs) && elapsed < RATE_LIMIT_MS) {
      const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          error: "Rate limited",
          message: `Ranks were last refreshed ${Math.round(elapsed / 60_000)} minutes ago. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
          lastFetched: lastIso,
          retryAfterSeconds: retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }
  }

  try {
    const summary = await refreshRanks(2026);
    return NextResponse.json({
      ok: true,
      summary: {
        ...summary,
        fetchedAt: summary.fetchedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Refresh failed", message }, { status: 500 });
  }
}
