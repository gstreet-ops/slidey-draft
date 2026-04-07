import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actualResults } from "@/db/schema";
import { scoreAllBoards } from "@/lib/scoring";
import { isDraftLocked, setConfig } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";

const SEASON = 2026;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  }

  return NextResponse.json({ success: true, result });
}
