import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getGroupById,
  getGroupMembers,
  getBoardsForGroup,
  getUserById,
  getLeaderboard,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function GroupPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  const group = await getGroupById(id);
  if (!group) notFound();

  const members = await getGroupMembers(id);
  const boards = await getBoardsForGroup(id, 2026);
  const season = 2026;
  const memberIds = members.map((m) => m.userId);
  const groupLeaderboard = await getLeaderboard(season, memberIds);
  const creator = await getUserById(group.createdBy);

  const allBoards = boards;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-2xl font-bold text-white tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--lions-blue)]">.COM</span> DRAFT
          </Link>
          <nav className="flex gap-4 text-sm text-white/60">
            <Link href="/picks" className="hover:text-white transition">
              All Picks
            </Link>
            {session?.user && (
              <Link href="/my-board" className="hover:text-white transition">
                My Board
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1
          className="text-4xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {group.name.toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {members.length} member{members.length !== 1 ? "s" : ""} &middot;
          Created by {creator?.name || creator?.email || "Unknown"}
        </p>

        {allBoards.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {allBoards.map((board) => (
              <Link
                key={board.id}
                href={`/picks/${board.id}`}
                className="group rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[var(--lions-blue)] transition">
                  {board.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {board.userName || board.userEmail} &middot;
                  Published{" "}
                  {board.publishedAt?.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}

        {boards.length === 0 && (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40 text-lg">
              No published boards yet. Members are still making their picks!
            </p>
          </div>
        )}

        {/* Members list */}
        <div className="mt-10">
          <h2
            className="text-2xl font-bold text-white tracking-wide mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MEMBERS
          </h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[var(--gtown-highlight)]">
                  {(m.userName || m.userEmail)?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <span className="text-sm font-medium text-white">
                    {m.userName || m.userEmail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {groupLeaderboard.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white tracking-wide mb-4" style={{ fontFamily: "var(--font-display)" }}>
              GROUP LEADERBOARD
            </h2>
            <div className="space-y-2">
              {groupLeaderboard.map((entry) => {
                return (
                  <Link
                    key={entry.boardId}
                    href={`/picks/${entry.boardId}`}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20"
                  >
                    <span className="w-8 text-center text-sm font-bold text-white/60">
                      {entry.currentRank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white">{entry.userName}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{entry.totalScore}</span>
                    <span className="text-xs text-white/40">pts</span>
                  </Link>
                );
              })}
            </div>
            <Link href="/leaderboard" className="mt-3 block text-center text-xs text-[var(--lions-blue)] hover:underline">
              View Full Leaderboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
