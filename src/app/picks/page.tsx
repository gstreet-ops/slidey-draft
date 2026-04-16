import Link from "next/link";
import Image from "next/image";
import { getBoards, getBoardWithPicks } from "@/lib/queries";
import { gradeMockDraft } from "@/lib/mock-grading";
import type { MockDraftGrade } from "@/lib/mock-grading";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users, teams } from "@/db/schema";
import { SiteFooter } from "@/components/site-footer";
import { GradeCircle } from "@/components/grade-circle";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");
  const session = await auth();

  // Enrich boards with creator info
  const enrichedBoards = await Promise.all(
    published.map(async (board) => {
      if (!board.createdBy) return { ...board, creator: null, team: null, grade: null as MockDraftGrade | null, pickCount: 0, noteCount: 0 };
      const [creator] = await db
        .select({ name: users.name, email: users.email, role: users.role, favoriteTeamId: users.favoriteTeamId })
        .from(users)
        .where(eq(users.id, board.createdBy));
      let team = null;
      if (creator?.favoriteTeamId) {
        const [t] = await db.select({ logoUrl: teams.logoUrl, primaryColor: teams.primaryColor, abbreviation: teams.abbreviation })
          .from(teams).where(eq(teams.id, creator.favoriteTeamId));
        team = t || null;
      }
      const boardData = await getBoardWithPicks(board.id);
      const grade = boardData && boardData.picks.length > 0
        ? gradeMockDraft(boardData.picks.map(p => ({
            pickNumber: p.pickNumber,
            playerGrade: p.playerGrade,
            playerRank: p.playerRank,
          })))
        : null;
      const noteCount = boardData ? boardData.picks.filter(p => p.analysis).length : 0;
      return { ...board, creator: creator || null, team, grade, pickCount: boardData?.picks.length ?? 0, noteCount };
    })
  );

  const allBoards = enrichedBoards;
  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1
          className="text-4xl font-bold text-white tracking-wide text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MOCK DRAFTS
        </h1>
        <p className="mt-2 text-center text-white/50">
          2026 NFL Mock Draft Boards
        </p>

        {allBoards.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {allBoards.map((board) => (
              <Link
                key={board.id}
                href={`/picks/${board.id}`}
                className="group rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition"
                style={board.team?.primaryColor ? { borderLeft: `4px solid ${board.team.primaryColor}` } : undefined}
              >
                <div className="flex items-center gap-3">
                  {board.team?.logoUrl && (
                    <Image src={board.team.logoUrl} alt={board.team.abbreviation || ""} width={28} height={28} className="shrink-0 object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white group-hover:text-[var(--lions-blue)] transition">
                      {board.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-white/50">
                      {board.creator?.name || board.creator?.email || "Anonymous"} &middot;
                      Published {board.publishedAt?.toLocaleDateString()}
                    </p>
                    {board.grade && (
                      <p className="mt-1 text-xs text-white/40">
                        {board.grade.steals} steal{board.grade.steals !== 1 ? "s" : ""} &middot; {board.grade.reaches} reach{board.grade.reaches !== 1 ? "es" : ""} &middot; {board.pickCount}/32 picks
                      </p>
                    )}
                    {board.noteCount > 0 && (
                      <p className="mt-0.5 text-xs text-white/40">💬 {board.noteCount} pick{board.noteCount !== 1 ? "s" : ""} with commentary</p>
                    )}
                  </div>
                  {board.grade && (
                    <div className="shrink-0">
                      <GradeCircle grade={board.grade.letterGrade} label={board.grade.pickGrades.length > 0 ? board.grade.summary.split(" — ")[0] : undefined} size="sm" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {published.length === 0 && (
          <div className="mt-12 rounded-xl bg-white/10 p-12 text-center">
            <p className="text-white/50 text-lg">No published boards yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
