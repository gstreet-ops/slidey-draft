import { notFound } from "next/navigation";
import { getDraftOrder, getPlayers, getBoardWithPicks } from "@/lib/queries";
import { PickBuilder } from "./pick-builder";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

export default async function BoardPage({ params }: { params: Params }) {
  const { boardId } = await params;

  const boardData = await getBoardWithPicks(boardId);
  if (!boardData) notFound();

  const draftOrder = await getDraftOrder(boardData.board.season);
  const allPlayers = await getPlayers();

  // Build set of already-picked player IDs
  const pickedPlayerIds = new Set(
    boardData.picks.map((p) => p.playerId)
  );
  const availablePlayers = allPlayers.filter(
    (p) => !pickedPlayerIds.has(p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {boardData.board.title.toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {boardData.board.season} &middot;{" "}
            {boardData.picks.length}/32 picks made
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          boardData.board.status === "published"
            ? "bg-green-500/20 text-green-400"
            : "bg-yellow-500/20 text-yellow-400"
        }`}>
          {boardData.board.status}
        </span>
      </div>

      <PickBuilder
        boardId={boardId}
        boardStatus={boardData.board.status}
        draftOrder={draftOrder}
        existingPicks={boardData.picks}
        availablePlayers={availablePlayers}
      />
    </div>
  );
}
