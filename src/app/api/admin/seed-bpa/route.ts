import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAndStoreBpaRankings } from "@/lib/bpa";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matched = await fetchAndStoreBpaRankings(2026);

  return NextResponse.json({ success: true, matchedPlayers: matched });
}
