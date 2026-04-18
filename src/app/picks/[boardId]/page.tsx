import { notFound } from "next/navigation";
import { getBoardWithPicks, getActualResults, getPickScoresForBoard } from "@/lib/queries";
import Link from "next/link";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { scores } from "@/db/schema";
import { PublicBoardView } from "@/components/public-board-view";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

export default async function PublicBoardPage({ params }: { params: Params }) {
  const { boardId } = await params;
  const data = await getBoardWithPicks(boardId);

  if (!data || data.board.status === "draft") notFound();

  const season = data.board.season;
  const results = await getActualResults(season);
  const pickScoreRows = await getPickScoresForBoard(boardId);
  const hasScoring = pickScoreRows.length > 0;

  let boardScore: { totalScore: number; correctExact: number; correctPlayer: number; accuracyPct: number | null } | null = null;
  if (hasScoring) {
    const [s] = await db
      .select({
        totalScore: scores.totalScore,
        correctExact: scores.correctExact,
        correctPlayer: scores.correctPlayer,
        accuracyPct: scores.accuracyPct,
      })
      .from(scores)
      .where(eq(scores.boardId, boardId));
    boardScore = s || null;
  }

  const scoreMap: Record<number, { pickNumber: number; matchType: string }> = {};
  for (const s of pickScoreRows) {
    scoreMap[s.pickNumber] = s;
  }

  const resultMap: Record<number, { pickNumber: number; playerName: string; playerPosition: string; playerSchool: string }> = {};
  for (const r of results) {
    resultMap[r.pickNumber] = r;
  }

  return (
    <div className="min-h-screen bg-[var(--steelers-black)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/picks" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition">&larr; All Boards</Link>
        <h1 className="mt-4 text-3xl font-bold text-[var(--text-primary)] tracking-wide sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          {data.board.title.toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{data.board.season} NFL Mock Draft &middot; {data.picks.length} picks</p>

        {boardScore && (
          <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider sm:text-xs">Score</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{boardScore.totalScore}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider sm:text-xs">Exact</p>
              <p className="text-lg font-bold text-green-400 sm:text-xl">{boardScore.correctExact}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider sm:text-xs">Correct</p>
              <p className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">{boardScore.correctPlayer}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider sm:text-xs">Accuracy</p>
              <p className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">{boardScore.accuracyPct?.toFixed(1)}%</p>
            </div>
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          <PublicBoardView picks={data.picks} scoreMap={scoreMap} resultMap={resultMap} />
        </div>
      </div>
    </div>
  );
}
