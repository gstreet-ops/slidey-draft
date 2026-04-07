import { notFound } from "next/navigation";
import { getBoardWithPicks, getActualResults, getPickScoresForBoard } from "@/lib/queries";
import Link from "next/link";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { scores } from "@/db/schema";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

const MATCH_BG: Record<string, string> = {
  exact: "border-green-500/30 bg-green-500/10",
  close: "border-yellow-500/30 bg-yellow-500/10",
  far: "border-orange-500/30 bg-orange-500/10",
  miss: "border-red-500/30 bg-red-500/10",
};

const MATCH_BADGE: Record<string, { text: string; color: string }> = {
  exact: { text: "+10", color: "text-green-400" },
  close: { text: "+5", color: "text-yellow-400" },
  far: { text: "+3", color: "text-orange-400" },
  miss: { text: "0", color: "text-red-400" },
};

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

  const scoreMap = new Map(pickScoreRows.map((s) => [s.pickNumber, s]));
  const resultMap = new Map(results.map((r) => [r.pickNumber, r]));

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/picks" className="text-sm text-white/40 hover:text-white/70 transition">← All Boards</Link>
        <h1 className="mt-4 text-4xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {data.board.title.toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-white/50">{data.board.season} NFL Mock Draft &middot; {data.picks.length} picks</p>

        {boardScore && (
          <div className="mt-4 flex gap-6 rounded-xl border border-white/10 bg-white/5 px-6 py-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Score</p>
              <p className="text-3xl font-bold text-white">{boardScore.totalScore}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Exact</p>
              <p className="text-xl font-bold text-green-400">{boardScore.correctExact}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Correct</p>
              <p className="text-xl font-bold text-white">{boardScore.correctPlayer}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Accuracy</p>
              <p className="text-xl font-bold text-white">{boardScore.accuracyPct?.toFixed(1)}%</p>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-2">
          {data.picks.map((pick) => {
            const score = scoreMap.get(pick.pickNumber);
            const result = resultMap.get(pick.pickNumber);
            const matchType = score?.matchType;
            const badge = matchType ? MATCH_BADGE[matchType] : null;
            const bgClass = matchType ? MATCH_BG[matchType] : "border-white/10 bg-white/5";

            return (
              <div key={pick.id} className={`flex items-center gap-4 rounded-lg border px-5 py-4 ${bgClass}`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: pick.teamPrimaryColor || "#333" }}>
                  {pick.pickNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold text-white ${pick.autoFilled ? "italic" : ""}`}>
                      {pick.playerName}
                      {pick.autoFilled && <span className="ml-2 text-xs text-yellow-400/70 font-medium not-italic">BPA</span>}
                    </span>
                    <span className="rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--lions-blue)]">{pick.playerPosition}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <span>{pick.playerSchool}</span>
                    <span className="text-white/20">→</span>
                    <span>{pick.teamName}</span>
                    <span className="text-xs text-white/30">({pick.teamAbbreviation})</span>
                  </div>
                  {result && matchType && matchType !== "exact" && (
                    <p className="mt-1 text-xs text-white/40">
                      Actual: <span className="text-white/60">{result.playerName}</span> ({result.playerPosition}, {result.playerSchool})
                    </p>
                  )}
                </div>
                {badge && <span className={`text-lg font-bold ${badge.color} shrink-0`}>{badge.text}</span>}
                {pick.analysis && !hasScoring && <p className="text-xs text-white/40 max-w-xs text-right">{pick.analysis}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
