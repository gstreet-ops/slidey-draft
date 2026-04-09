import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getActualResults, getDraftOrder, getPoolsForUser, getPlayers } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { WarRoom } from "./war-room";
import { LivePredictionWidget } from "@/components/live-prediction";
import { TriviaCard } from "@/components/trivia-card";
import { SoundToggle } from "@/components/sound-toggle";
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
  const allPlayers = await getPlayers();

  let userBoardId: string | null = null;
  let userPools: { poolId: string; poolName: string }[] = [];
  if (userId) {
    const board = await getUserBoard(userId, season);
    userBoardId = board?.id || null;
    if (session?.user?.status === "active") {
      userPools = await getPoolsForUser(userId);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            SLIDEY<span className="text-[var(--slidey)]">.COM</span> DRAFT
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-medium">LIVE</span>
            </span>
            <SoundToggle />
            <nav className="flex gap-3 text-sm text-white/60">
              <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
              {session?.user && <span className="text-white/40">{session.user.name || session.user.email}</span>}
            </nav>
          </div>
        </div>
      </header>

      {/* Live Prediction Widget for pool members */}
      {userPools.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4">
          <LivePredictionWidget
            poolId={userPools[0].poolId}
            poolName={userPools[0].poolName}
            allPlayers={allPlayers}
            actualResults={results}
            draftOrder={draftOrder.map((d) => ({
              pickNumber: d.pickNumber,
              teamName: d.teamName,
              teamAbbreviation: d.teamAbbreviation,
            }))}
          />
        </div>
      )}

      {userPools.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-2">
          <TriviaCard poolId={userPools[0].poolId} />
        </div>
      )}

      <WarRoom
        userId={userId}
        userBoardId={userBoardId}
        initialResults={results}
        draftOrder={draftOrder}
        season={season}
        poolId={userPools.length > 0 ? userPools[0].poolId : null}
      />
    </div>
  );
}
