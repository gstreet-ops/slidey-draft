// Dashboard page: pre-draft hub showing published mock count, user mock status,
// days-until-draft countdown, and a horizontal comparison grid of all published
// mock drafts. Redirects to /live when draft is locked. Candidate for merging
// into /my-board or /pools if we want fewer pages.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getBoards, getUserBoard } from "@/lib/queries";
import { isDraftLocked } from "@/lib/config";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { users, picks, players, teams } from "@/db/schema";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Onboarding: pick a team first
  if (!session.user.favoriteTeam) redirect("/onboarding/team");

  const locked = await isDraftLocked();
  if (locked) redirect("/live");

  const season = 2026;
  const boards = await getBoards(season);
  const published = boards.filter((b) => b.status === "published");
  const userBoard = await getUserBoard(session.user.id, season);

  const draftDate = new Date("2026-04-23T20:00:00-04:00");
  const now = new Date();
  const daysUntilDraft = Math.max(0, Math.ceil((draftDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Enrich boards with creator + picks
  const enrichedBoards = await Promise.all(
    published.map(async (board) => {
      let creator = null;
      if (board.createdBy) {
        const [u] = await db
          .select({ name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, board.createdBy));
        creator = u || null;
      }
      const boardPicks = await db
        .select({
          pickNumber: picks.pickNumber,
          playerName: players.name,
          playerPosition: players.position,
          teamAbbreviation: teams.abbreviation,
          teamPrimaryColor: teams.primaryColor,
          autoFilled: picks.autoFilled,
        })
        .from(picks)
        .innerJoin(players, eq(picks.playerId, players.id))
        .innerJoin(teams, eq(picks.teamId, teams.id))
        .where(eq(picks.boardId, board.id))
        .orderBy(asc(picks.pickNumber));
      return { ...board, creator, picks: boardPicks };
    })
  );

  const sorted = enrichedBoards.sort((a, b) => {
    const aIsAdmin = a.creator?.role === "admin" ? 0 : 1;
    const bIsAdmin = b.creator?.role === "admin" ? 0 : 1;
    if (aIsAdmin !== bIsAdmin) return aIsAdmin - bIsAdmin;
    const aIsUser = a.createdBy === session.user!.id ? 0 : 1;
    const bIsUser = b.createdBy === session.user!.id ? 0 : 1;
    return aIsUser - bIsUser;
  });

  return (
    <div className="min-h-screen bg-[var(--steelers-black)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Published Mocks</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{published.length}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Your Mock</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {userBoard ? (userBoard.status === "published" ? "Published" : "Draft") : "Not Started"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Days Until Draft</p>
              <p className="text-2xl font-bold text-[var(--slidey)]">{daysUntilDraft}</p>
            </div>
          </div>
          {!userBoard && (
            <Link href="/my-board" className="w-full sm:w-auto rounded-lg bg-[var(--steelers-gold)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition text-center">
              Create Your Mock Draft
            </Link>
          )}
        </div>

        {/* Comparison grid */}
        {sorted.length > 0 ? (
          <div className="mt-8 overflow-x-auto">
            <div className="inline-flex gap-4" style={{ minWidth: sorted.length * 280 }}>
              {sorted.map((board) => {
                const isUser = board.createdBy === session.user!.id;
                return (
                  <div key={board.id} className={`w-[260px] shrink-0 rounded-xl border p-4 ${isUser ? "border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/5" : "border-[var(--border)] bg-[var(--bg-card)]"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {isUser && <span className="rounded-full bg-[var(--steelers-gold)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-text)]">You</span>}
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate">{board.creator?.name || board.creator?.email || "Anonymous"}</span>
                    </div>
                    <h3 className="text-xs text-[var(--text-muted)] truncate mb-3">{board.title}</h3>
                    <div className="space-y-1">
                      {Array.from({ length: 32 }, (_, i) => i + 1).map((num) => {
                        const pick = board.picks.find((p) => p.pickNumber === num);
                        return (
                          <div key={num} className="flex items-center gap-2 rounded px-2 py-1 text-xs">
                            <span className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: pick?.teamPrimaryColor || "#333" }}>{num}</span>
                            {pick ? (
                              <span className={`text-[var(--text-primary)] truncate ${pick.autoFilled ? "italic" : ""}`}>
                                {pick.playerName}
                                {pick.autoFilled && <span className="ml-1 text-[9px] text-yellow-400/60">BPA</span>}
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <Link href={`/picks/${board.id}`} className="mt-3 block text-center text-xs text-[var(--slidey)] hover:underline">View Full Board</Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
            <p className="text-[var(--text-muted)] text-lg">No published boards yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
