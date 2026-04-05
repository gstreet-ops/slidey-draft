import { notFound } from "next/navigation";
import { getBoardWithPicks } from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Promise<{ boardId: string }>;

export default async function PublicBoardPage({ params }: { params: Params }) {
  const { boardId } = await params;
  const data = await getBoardWithPicks(boardId);

  if (!data || data.board.status === "draft") notFound();

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/picks"
          className="text-sm text-white/40 hover:text-white/70 transition"
        >
          ← All Boards
        </Link>
        <h1
          className="mt-4 text-4xl font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.board.title.toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {data.board.season} NFL Mock Draft &middot;{" "}
          {data.picks.length} picks
        </p>

        <div className="mt-8 space-y-2">
          {data.picks.map((pick) => (
            <div
              key={pick.id}
              className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-5 py-4"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
                style={{
                  backgroundColor: pick.teamPrimaryColor || "#333",
                }}
              >
                {pick.pickNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">
                    {pick.playerName}
                  </span>
                  <span className="rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--lions-blue)]">
                    {pick.playerPosition}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <span>{pick.playerSchool}</span>
                  <span className="text-white/20">→</span>
                  <span>{pick.teamName}</span>
                  <span className="text-xs text-white/30">
                    ({pick.teamAbbreviation})
                  </span>
                </div>
              </div>
              {pick.analysis && (
                <p className="text-xs text-white/40 max-w-xs text-right">
                  {pick.analysis}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
