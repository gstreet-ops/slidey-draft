import { auth } from "@/lib/auth";
import { getUserBoard, getActualResults, getDraftOrder, getPoolsForUser, getPlayers, getPoolById } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { getPoolSettings, getPoolRole } from "@/lib/pool-helpers";
import { WarRoom } from "./war-room";
import { LivePredictionWidget } from "@/components/live-prediction";
import { SoundToggle } from "@/components/sound-toggle";
import { VideoWidget } from "@/components/video-widget";
export const dynamic = "force-dynamic";

type PoolContext = {
  poolId: string;
  poolName: string;
  commissionerId: string;
  isCommissioner: boolean;
  triviaTimerSeconds: number;
  watchPartyEnabled: boolean;
  scoringConfig: {
    scoringMode: "standard" | "custom";
    mockPointValues: { playerCalled: number; rangeClose: number; rangeFar: number; exactSlot: number; positionMatch: number };
    livePointValues: { correctPlayer: number };
    triviaPointValues: { easy: number; medium: number; hard: number };
  };
};

export default async function LivePage() {
  const session = await auth();
  const locked = await isDraftLocked();

  const season = 2026;
  const draftOrder = await getDraftOrder(season);
  const userId = session?.user?.id || null;
  const results = await getActualResults(season);
  const allPlayers = await getPlayers();

  let userBoardId: string | null = null;
  const poolContexts: PoolContext[] = [];
  let isSpectator = false;

  if (userId) {
    const board = await getUserBoard(userId, season);
    userBoardId = board?.id || null;
    isSpectator = session?.user?.status === "spectator";

    const userPools = await getPoolsForUser(userId);
    for (const up of userPools) {
      const pool = await getPoolById(up.poolId);
      if (!pool) continue;
      const settings = getPoolSettings(pool.settings);
      const poolRole = await getPoolRole(userId, up.poolId);
      poolContexts.push({
        poolId: up.poolId,
        poolName: up.poolName,
        commissionerId: pool.commissionerId,
        isCommissioner: poolRole === "commissioner" || poolRole === "admin" || session?.user?.role === "admin",
        triviaTimerSeconds: settings.triviaTimerSeconds ?? 30,
        watchPartyEnabled: settings.watchParty,
        scoringConfig: {
          scoringMode: settings.scoringMode,
          mockPointValues: settings.mockPointValues,
          livePointValues: settings.livePointValues,
          triviaPointValues: settings.triviaPointValues,
        },
      });
    }
  }

  const activePool = poolContexts[0] ?? null;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Status bar */}
      <div className="border-b border-white/5 bg-black/10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-1.5">
          <span className="flex items-center gap-1.5 text-xs">
            {locked ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium">LIVE</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-yellow-400 font-medium">PRE-DRAFT</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-3">
            <SoundToggle />
            {session?.user && <span className="text-xs text-white/40">{session.user.name || session.user.email}</span>}
          </div>
        </div>
      </div>

      {/* Pre-draft banner */}
      {!locked && poolContexts.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
            <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Draft hasn&apos;t started yet</h2>
            <p className="text-xs text-white/50 mt-1">
              {activePool?.isCommissioner
                ? "Use the simulation and trivia controls below to set up and test. Trivia auto-advances with each pick."
                : "Come back when the draft is live to see picks, make predictions, and answer trivia."}
            </p>
          </div>
        </div>
      )}

      {/* No pool state */}
      {poolContexts.length === 0 && userId && (
        <div className="mx-auto max-w-[1400px] px-4 pt-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>JOIN A POOL TO PLAY</h2>
            <p className="mt-2 text-sm text-white/50">You need to join a pool to participate. Ask your commissioner for an invite link.</p>
          </div>
        </div>
      )}

      {/* Not logged in */}
      {!userId && (
        <div className="mx-auto max-w-[1400px] px-4 pt-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>SIGN IN TO PLAY</h2>
            <p className="mt-2 text-sm text-white/50">Sign in to join a pool and compete on draft night.</p>
          </div>
        </div>
      )}

      {/* Main content — only when user has pools */}
      {poolContexts.length > 0 && (
        <>
          {/* Live Prediction Widget */}
          {locked && (
            <div className="mx-auto max-w-[1400px] px-4 pt-4">
              <LivePredictionWidget
                poolId={activePool!.poolId}
                poolName={activePool!.poolName}
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

          <WarRoom
            userId={userId}
            userBoardId={userBoardId}
            initialResults={results}
            draftOrder={draftOrder}
            season={season}
            poolContexts={poolContexts}
            isSpectator={isSpectator}
          />

          {activePool!.watchPartyEnabled && locked && (
            <VideoWidget poolId={activePool!.poolId} poolName={activePool!.poolName} />
          )}
        </>
      )}
    </div>
  );
}
