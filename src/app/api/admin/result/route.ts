import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actualResults, triviaQuestions, pools } from "@/db/schema";
import { scoreAllBoards } from "@/lib/scoring";
import { isDraftLocked, setConfig } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";
import { eq, isNull, asc, sql } from "drizzle-orm";
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

      // Auto-fire trivia for pools in auto mode
      const allPools = await db.select({ id: pools.id, settings: pools.settings }).from(pools);
      for (const pool of allPools) {
        const settings = getPoolSettings(pool.settings);
        if (settings.triviaMode === "auto" && settings.trivia) {
          // Find next unused question
          const [nextQ] = await db
            .select({ id: triviaQuestions.id })
            .from(triviaQuestions)
            .where(isNull(triviaQuestions.firedAt))
            .orderBy(asc(triviaQuestions.sortOrder), asc(triviaQuestions.createdAt))
            .limit(1);

          if (nextQ) {
            await db
              .update(triviaQuestions)
              .set({
                firedAt: new Date(Date.now() + 10_000), // 10s delay after pick
                pickNumber: result.pickNumber,
              })
              .where(eq(triviaQuestions.id, nextQ.id));
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
