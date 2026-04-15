import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actualResults, poolTriviaQueue, pools } from "@/db/schema";
import { scoreAllBoards } from "@/lib/scoring";
import { isDraftLocked, setConfig } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";
import { eq, and, asc } from "drizzle-orm";
import { getPoolSettings } from "@/lib/pool-helpers";

const SEASON = 2026;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { pickNumber, playerId, teamId } = body;

    if (!pickNumber || !playerId || !teamId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [result] = await db
      .insert(actualResults)
      .values({
        season: SEASON,
        pickNumber,
        playerId,
        teamId,
        announcedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (result) {
      const locked = await isDraftLocked();
      if (!locked) {
        await setConfig("draft_locked", "true");
        await autoFillAllBoards(SEASON);
      }
      await scoreAllBoards(SEASON);

      // Auto-advance trivia queue: complete active question, fire next pending
      const allPools = await db.select({ id: pools.id, settings: pools.settings }).from(pools);
      for (const pool of allPools) {
        const settings = getPoolSettings(pool.settings);
        if (settings.trivia) {
          // Complete any currently active question
          await db
            .update(poolTriviaQueue)
            .set({ status: "completed", completedAt: new Date() })
            .where(and(eq(poolTriviaQueue.poolId, pool.id), eq(poolTriviaQueue.status, "active")));

          // Activate next pending question
          const [next] = await db
            .select({ id: poolTriviaQueue.id })
            .from(poolTriviaQueue)
            .where(and(eq(poolTriviaQueue.poolId, pool.id), eq(poolTriviaQueue.status, "pending")))
            .orderBy(asc(poolTriviaQueue.sortOrder))
            .limit(1);

          if (next) {
            await db
              .update(poolTriviaQueue)
              .set({ status: "active", activatedAt: new Date(), pickNumber: result.pickNumber })
              .where(eq(poolTriviaQueue.id, next.id));
          }
        }
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("[Admin Result] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
