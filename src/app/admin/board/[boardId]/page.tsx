import { notFound, redirect } from "next/navigation";
import { getDraftOrder, getPlayers, getBoardWithPicks } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { PickBuilder } from "./pick-builder";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

export default async function BoardPage({ params }: { params: Params }) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");

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
            className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {boardData.board.title.toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {boardData.board.season} &middot;{" "}
            {boardData.picks.length}/32 picks made
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          boardData.board.status === "published"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
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
        favoriteTeamAbbr={session?.user?.favoriteTeam?.abbreviation ?? null}
      />
    </div>
  );
}
