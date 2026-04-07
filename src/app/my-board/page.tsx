import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getDraftOrder, getPlayers, getBoardWithPicks } from "@/lib/queries";
import { createUserBoard } from "@/lib/actions";
import { PickBuilder } from "@/app/admin/board/[boardId]/pick-builder";
import Link from "next/link";
import { isDraftLocked } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function MyBoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const season = 2026;
  const locked = await isDraftLocked();
  let board = await getUserBoard(session.user.id, season);

  // Auto-create board if none exists
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
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xl font-bold tracking-wide text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SLIDEY<span className="text-[var(--gtown-highlight)]">.COM</span> DRAFT
            </Link>
            <nav className="flex gap-4 text-sm text-white/60">
              <Link href="/picks" className="hover:text-white transition">
                All Picks
              </Link>
              <Link href="/" className="hover:text-white transition">
                Home
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[var(--gtown-highlight)] flex items-center justify-center text-white text-xs font-bold">
              {(session.user.name || session.user.email)?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm text-white/80">
              {session.user.name || session.user.email}
            </span>
          </div>
        </div>
      </header>

      {locked && (
        <div className="bg-[var(--lions-blue)]/20 border-b border-[var(--lions-blue)]/30 px-6 py-3 text-center">
          <p className="text-sm font-medium text-[var(--lions-blue)]">
            Mock drafts are locked — the draft is live!{" "}
            <Link href="/live" className="underline hover:text-white transition">
              Watch in the War Room →
            </Link>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl font-bold text-white tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                YOUR MOCK DRAFT
              </h1>
              <p className="mt-1 text-sm text-white/50">
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
