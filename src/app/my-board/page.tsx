import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getDraftOrder, getPlayers, getBoardWithPicks } from "@/lib/queries";
import { createUserBoard } from "@/lib/actions";
import { PickBuilder } from "@/app/admin/board/[boardId]/pick-builder";
import Link from "next/link";
import { isDraftLocked } from "@/lib/config";
import { DraftLockedBanner } from "@/components/draft-locked-banner";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function MyBoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.status !== "active") redirect("/");

  const season = 2026;
  const locked = await isDraftLocked();
  let board = await getUserBoard(session.user.id, season);

  if (!board) {
    board = await createUserBoard(season);
  }

  const boardData = await getBoardWithPicks(board.id);
  if (!boardData) redirect("/");

  const draftOrder = await getDraftOrder(season);
  const allPlayers = await getPlayers();

  const pickedPlayerIds = new Set(boardData.picks.map((p) => p.playerId));
  const availablePlayers = allPlayers.filter((p) => !pickedPlayerIds.has(p.id));

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      {locked && <DraftLockedBanner />}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-white tracking-wide sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                YOUR MOCK DRAFT
              </h1>
              <p className="mt-1 text-xs text-white/50 sm:text-sm">
                {season} &middot; {boardData.picks.length}/32 picks made
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                boardData.board.status === "published"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {boardData.board.status}
            </span>
          </div>

          <PickBuilder
            boardId={board.id}
            boardStatus={boardData.board.status}
            draftOrder={draftOrder}
            existingPicks={boardData.picks}
            availablePlayers={availablePlayers}
            readOnly={locked}
          />
        </div>
      </main>
    </div>
  );
}
