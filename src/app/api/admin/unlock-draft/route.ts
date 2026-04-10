import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setConfig } from "@/lib/config";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await setConfig("draft_locked", "false");
    return NextResponse.json({ success: true, locked: false });
  } catch (err) {
    console.error("[Admin Unlock Draft] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
