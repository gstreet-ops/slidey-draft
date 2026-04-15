import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actualResults } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPoolRole } from "@/lib/pool-helpers";

// Track skipped picks in memory (per-deploy). For persistence, could move to appConfig.
const skippedPicks = new Set<string>(); // "poolId:pickNumber"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poolId } = await params;
  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [latestPick] = await db
    .select({ pickNumber: actualResults.pickNumber })
    .from(actualResults)
    .where(eq(actualResults.season, 2026))
    .orderBy(sql`pick_number DESC`)
    .limit(1);

  const currentPick = latestPick?.pickNumber ?? 0;
  skippedPicks.add(`${poolId}:${currentPick}`);

  return NextResponse.json({ success: true, skippedPick: currentPick });
}

export function isPickSkipped(poolId: string, pickNumber: number): boolean {
  return skippedPicks.has(`${poolId}:${pickNumber}`);
}
