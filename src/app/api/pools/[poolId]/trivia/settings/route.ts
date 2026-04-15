import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPoolRole, getPoolSettings } from "@/lib/pool-helpers";

export async function PATCH(
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

  const { triviaTimerSeconds, triviaMode } = await req.json();

  const [pool] = await db.select({ settings: pools.settings }).from(pools).where(eq(pools.id, poolId));
  const current = getPoolSettings(pool?.settings);

  if (triviaTimerSeconds !== undefined) {
    const t = Number(triviaTimerSeconds);
    if (![0, 15, 30, 45, 60].includes(t)) {
      return NextResponse.json({ error: "Timer must be 0, 15, 30, 45, or 60" }, { status: 400 });
    }
    current.triviaTimerSeconds = t;
  }

  if (triviaMode !== undefined) {
    if (triviaMode !== "auto" && triviaMode !== "manual") {
      return NextResponse.json({ error: "Mode must be 'auto' or 'manual'" }, { status: 400 });
    }
    current.triviaMode = triviaMode;
  }

  await db.update(pools).set({ settings: current }).where(eq(pools.id, poolId));

  return NextResponse.json({ success: true, settings: { triviaTimerSeconds: current.triviaTimerSeconds, triviaMode: current.triviaMode } });
}
