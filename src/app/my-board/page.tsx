import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBoard, getDraftOrder, getPlayers, getBoardWithPicks } from "@/lib/queries";
import { createUserBoard } from "@/lib/actions";
import { PickBuilder } from "@/app/admin/board/[boardId]/pick-builder";
import Link from "next/link";
import { isDraftLocked } from "@/lib/config";
import { DraftLockedBanner } from "@/components/draft-locked-banner";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

export default async function MyBoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  const navLinks = [
    { href: "/picks", label: "Mock Drafts" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/pools", label: "Pools" },
    { href: "/live", label: "Live" },
    { href: "/", label: "Home" },
  ];

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <MobileNav
        links={navLinks}
        logo={
          <Link
            href="/"
            className="text-lg font-bold tracking-wide text-white sm:text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
        }
        trailing={
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[var(--gtown-highlight)] flex items-center justify-center text-white text-xs font-bold">
              {(session.user.name || session.user.email)?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm text-white/80 hidden sm:inline">
              {session.user.name || session.user.email}
            </span>
          </div>
        }
      />

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
