import Link from "next/link";
import Image from "next/image";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { draftBoards, picks, players, users } from "@/db/schema";
import { getDraftOrder, getTrades } from "@/lib/queries";
import { gradeMockDraft } from "@/lib/mock-grading";
import { PickGradeBadge } from "@/components/pick-grade-badge";
import { DraftCountdown } from "./countdown";

export const dynamic = "force-dynamic";

const SEASON = 2026;

type BoardSummary = {
  boardId: string;
  title: string;
  userName: string | null;
  userImage: string | null;
};
type BoardPick = { pickNumber: number; playerGrade: number | null; playerRank: number | null };

type NewsItem = { headline: string; source: "ESPN" | "NFL.com" | "PFF"; hoursAgo: number };

/** TODO: Replace with ESPN RSS feed integration. Hardcoded placeholders for now. */
const PLACEHOLDER_NEWS: NewsItem[] = [
  { headline: "Mock Draft 5.0: Three QBs go in the first round", source: "ESPN", hoursAgo: 2 },
  { headline: "Top 50 Big Board update — shake-up at the top", source: "NFL.com", hoursAgo: 6 },
  { headline: "Combine winners and losers: who helped themselves most", source: "PFF", hoursAgo: 14 },
  { headline: "Draft night trade rumors: which teams are moving up?", source: "ESPN", hoursAgo: 26 },
];

function relTime(hoursAgo: number): string {
  if (hoursAgo < 1) return "just now";
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const d = Math.floor(hoursAgo / 24);
  return `${d}d ago`;
}

export default async function DraftHubPage() {
  const [pickRows, draftOrder, tradeRows] = await Promise.all([
    db
      .select({
        boardId: picks.boardId,
        boardTitle: draftBoards.title,
        createdBy: draftBoards.createdBy,
        userName: users.name,
        userImage: users.image,
        pickNumber: picks.pickNumber,
        playerGrade: players.grade,
        playerRank: players.rank,
      })
      .from(picks)
      .innerJoin(players, eq(picks.playerId, players.id))
      .innerJoin(draftBoards, eq(picks.boardId, draftBoards.id))
      .leftJoin(users, eq(draftBoards.createdBy, users.id))
      .where(
        and(
          eq(draftBoards.season, SEASON),
          eq(draftBoards.status, "published"),
          eq(draftBoards.type, "mock")
        )
      ),
    getDraftOrder(SEASON),
    getTrades(SEASON),
  ]);

  // ── Leaderboard: group picks by board, grade, rank top 5 ───
  const boardMap = new Map<string, BoardSummary & { picks: BoardPick[] }>();
  for (const r of pickRows) {
    let entry = boardMap.get(r.boardId);
    if (!entry) {
      entry = {
        boardId: r.boardId,
        title: r.boardTitle,
        userName: r.userName,
        userImage: r.userImage,
        picks: [],
      };
      boardMap.set(r.boardId, entry);
    }
    entry.picks.push({
      pickNumber: r.pickNumber,
      playerGrade: r.playerGrade,
      playerRank: r.playerRank,
    });
  }
  const leaderboard = Array.from(boardMap.values())
    .map((b) => ({ ...b, grade: gradeMockDraft(b.picks) }))
    .sort((a, b) => b.grade.numericAverage - a.grade.numericAverage)
    .slice(0, 5);

  // ── Team Needs: unique teams, sorted by their earliest pick in the order ──
  const seenTeams = new Set<string>();
  const teamsInOrder = draftOrder.filter((slot) => {
    if (seenTeams.has(slot.teamId)) return false;
    seenTeams.add(slot.teamId);
    return true;
  });

  const recentTrades = tradeRows.slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-8">
      {/* 1. Countdown banner */}
      <DraftCountdown />

      {/* 2. Top Mock Drafts leaderboard */}
      <section>
        <SectionHeader title="Top Mock Drafts" viewAllHref="/mock-drafts" />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border-light)] overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No published mock drafts yet.
            </div>
          ) : (
            leaderboard.map((b, i) => {
              const rank = i + 1;
              return (
                <Link
                  key={b.boardId}
                  href={`/picks/${b.boardId}`}
                  className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 hover:bg-[var(--bg-section)] transition"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums text-[var(--accent-text)]"
                    style={{
                      backgroundColor:
                        rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "var(--bg-section)",
                      color: rank <= 3 ? "#1a1a2e" : undefined,
                    }}
                  >
                    {rank}
                  </span>
                  {b.userImage ? (
                    <Image
                      src={b.userImage}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-section)] text-xs font-bold text-[var(--text-muted)]">
                      {(b.userName || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {b.title}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {b.userName ?? "Unknown"} &middot; {b.grade.totalPicks} picks
                    </p>
                  </div>
                  <PickGradeBadge grade={b.grade.letterGrade} size="md" />
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Team Needs grid */}
      <section>
        <SectionHeader title="Team Needs" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
          {teamsInOrder.map((t) => {
            const topNeeds = (t.teamNeeds ?? []).slice(0, 3);
            return (
              <div
                key={t.teamId}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-sm"
                style={{ borderLeft: `4px solid ${t.teamPrimaryColor || "var(--border)"}` }}
              >
                <div className="flex items-center gap-2">
                  {t.teamLogoUrl && (
                    <Image
                      src={t.teamLogoUrl}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {t.teamAbbreviation}
                    </p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      Pick #{t.pickNumber}
                    </p>
                  </div>
                </div>
                {topNeeds.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {topNeeds.map((need) => (
                      <span
                        key={need}
                        className="rounded-full bg-[var(--bg-section)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
                      >
                        {need}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] italic text-[var(--text-muted)]">No needs listed</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Recent trades */}
      <section>
        <SectionHeader title="Recent Trades" viewAllHref="/trades" />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border-light)] overflow-hidden">
          {recentTrades.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No trades yet this season.
            </div>
          ) : (
            recentTrades.map((tr) => (
              <div key={tr.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  {tr.previousTeamLogoUrl && (
                    <Image
                      src={tr.previousTeamLogoUrl}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 opacity-60"
                    />
                  )}
                  <span className="text-xs font-semibold text-[var(--text-muted)] line-through">
                    {tr.previousTeamAbbreviation}
                  </span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {tr.newTeamAbbreviation}
                  </span>
                  {tr.newTeamLogoUrl && (
                    <Image
                      src={tr.newTeamLogoUrl}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">
                    <span className="font-semibold">Pick #{tr.pickNumber}</span>
                    {tr.tradeNote && <span className="text-[var(--text-muted)]"> &middot; {tr.tradeNote}</span>}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {new Date(tr.detectedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. News feed (placeholder) — TODO: Replace with ESPN RSS feed integration */}
      <section>
        <SectionHeader title="Draft News" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLACEHOLDER_NEWS.map((n, i) => (
            <article
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-sm"
            >
              <span
                className="inline-flex w-fit items-center rounded-full bg-[var(--bg-section)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]"
              >
                {n.source}
              </span>
              <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
                {n.headline}
              </p>
              <p className="mt-auto text-[10px] text-[var(--text-muted)]">{relTime(n.hoursAgo)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionHeader({ title, viewAllHref }: { title: string; viewAllHref?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2
        className="text-xl sm:text-2xl tracking-wide text-[var(--text-primary)] uppercase"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] hover:underline"
        >
          View All →
        </Link>
      )}
    </div>
  );
}
