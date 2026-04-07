import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getActualResults, getDraftOrder } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { WarRoom } from "./war-room";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await auth();
  const locked = await isDraftLocked();

  if (!locked) redirect("/dashboard");

  const season = 2026;
  const draftOrder = await getDraftOrder(season);
  const userId = session?.user?.id || null;
  const results = await getActualResults(season);

  let userBoardId: string | null = null;
  if (userId) {
    const board = await getUserBoard(userId, season);
    userBoardId = board?.id || null;
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">LIVE</span>
            </span>
            <nav className="flex gap-3 text-sm text-white/60">
              <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
              {session?.user && <span className="text-white/40">{session.user.name || session.user.email}</span>}
            </nav>
          </div>
        </div>
      </header>

      <WarRoom
        userId={userId}
        userBoardId={userBoardId}
        initialResults={results}
        draftOrder={draftOrder}
        season={season}
      />
    </div>
  );
}
