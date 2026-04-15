import { auth } from "@/lib/auth";
import { getUserBoard, getActualResults, getDraftOrder, getPoolsForUser, getPlayers, getPoolById } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { getPoolSettings, getPoolRole } from "@/lib/pool-helpers";
import { WarRoom } from "./war-room";
import { LivePredictionWidget } from "@/components/live-prediction";
import { TriviaCard } from "@/components/trivia-card";
import { CollapsibleTriviaControls } from "@/components/collapsible-trivia-controls";
import { SoundToggle } from "@/components/sound-toggle";
import { VideoWidget } from "@/components/video-widget";
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await auth();
  const locked = await isDraftLocked();

  const season = 2026;
  const draftOrder = await getDraftOrder(season);
  const userId = session?.user?.id || null;
  const results = await getActualResults(season);
  const allPlayers = await getPlayers();

  let userBoardId: string | null = null;
  let userPools: { poolId: string; poolName: string }[] = [];
  let watchPartyEnabled = true;
  let chatEnabled = false;
  let commissionerId = "";
  let isSpectator = false;
  let isCommissioner = false;
  let triviaTimerSeconds = 30;
  if (userId) {
    const board = await getUserBoard(userId, season);
    userBoardId = board?.id || null;
    userPools = await getPoolsForUser(userId);
    if (userPools.length > 0) {
      const pool = await getPoolById(userPools[0].poolId);
      if (pool) {
        const settings = getPoolSettings(pool.settings);
        watchPartyEnabled = settings.watchParty;
        chatEnabled = true;
        commissionerId = pool.commissionerId;
        isSpectator = session?.user?.status === "spectator";
        triviaTimerSeconds = settings.triviaTimerSeconds ?? 30;
        const poolRole = await getPoolRole(userId, userPools[0].poolId);
        isCommissioner = poolRole === "commissioner" || poolRole === "admin" || session?.user?.role === "admin";
      }
    }
  }

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
      {!locked && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
            <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Draft hasn&apos;t started yet</h2>
            <p className="text-xs text-white/50 mt-1">
              {isCommissioner
                ? "Use the trivia controls below to set up and test questions. Trivia will auto-advance when picks come in during the draft or simulation."
                : "Come back when the draft is live to see picks, make predictions, and answer trivia."}
            </p>
          </div>
        </div>
      )}

      {/* Live Prediction Widget for pool members */}
      {userPools.length > 0 && locked && (
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

      {/* Commissioner Trivia Controls — collapsible */}
      {isCommissioner && userPools.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-2">
          <CollapsibleTriviaControls poolId={userPools[0].poolId} triviaTimerSeconds={triviaTimerSeconds} />
        </div>
      )}

      <WarRoom
        userId={userId}
        userBoardId={userBoardId}
        initialResults={results}
        draftOrder={draftOrder}
        season={season}
        poolId={userPools.length > 0 ? userPools[0].poolId : null}
        chatEnabled={chatEnabled}
        chatPoolId={userPools.length > 0 ? userPools[0].poolId : null}
        chatPoolName={userPools.length > 0 ? userPools[0].poolName : ""}
        commissionerId={commissionerId}
        isSpectator={isSpectator}
      />

      {userPools.length > 0 && watchPartyEnabled && locked && (
        <VideoWidget poolId={userPools[0].poolId} poolName={userPools[0].poolName} />
      )}
    </div>
  );
}
