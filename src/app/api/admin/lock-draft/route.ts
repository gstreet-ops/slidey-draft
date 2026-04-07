import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setConfig } from "@/lib/config";
import { autoFillAllBoards } from "@/lib/bpa";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await setConfig("draft_locked", "true");
    const filled = await autoFillAllBoards(2026);

    return NextResponse.json({ success: true, locked: true, boardsAutoFilled: filled });
  } catch (err) {
    console.error("[Admin Lock Draft] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
