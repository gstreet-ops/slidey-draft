import Link from "next/link";
import Image from "next/image";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { draftBoards, picks, players, users } from "@/db/schema";
import {
  getDraftOrder,
  getTrades,
  getPoolsForUser,
  getPoolStandings,
  getPoolMemberCount,
  getUserBoard,
} from "@/lib/queries";
import { gradeMockDraft, type LetterGrade } from "@/lib/mock-grading";
import { auth } from "@/lib/auth";
import { getTeamTheme } from "@/lib/team-themes";
import { PickGradeBadge } from "@/components/pick-grade-badge";
import {
  type DraftContent,
  getFeaturedArticle,
  getCoverageArticles,
  getTeamArticles,
  getHeadlineStrip,
} from "@/lib/draft-hub-content";
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

export default async function DraftHubPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [pickRows, draftOrder, tradeRows, userPools, userBoard] = await Promise.all([
    db
      .select({
        boardId: picks.boardId,
        boardTitle: draftBoards.title,
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
    userId ? getPoolsForUser(userId) : Promise.resolve([]),
    userId ? getUserBoard(userId, SEASON) : Promise.resolve(undefined),
  ]);

  const primaryPool = userPools[0] ?? null;

  const [standings, memberCount, userBoardPickCount] = await Promise.all([
    primaryPool ? getPoolStandings(primaryPool.poolId) : Promise.resolve([]),
    primaryPool ? getPoolMemberCount(primaryPool.poolId) : Promise.resolve(0),
    userBoard
      ? db
          .select({ n: sql<number>`count(*)` })
          .from(picks)
          .where(eq(picks.boardId, userBoard.id))
          .then((r) => Number(r[0]?.n ?? 0))
      : Promise.resolve(0),
  ]);

  const userStanding = standings.find((s) => s.userId === userId) ?? null;
  const poolLeader = standings[0] ?? null;

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

  // ── Team Needs: unique teams, sorted by their earliest pick ───
  const seenTeams = new Set<string>();
  const teamsInOrder = draftOrder.filter((slot) => {
    if (seenTeams.has(slot.teamId)) return false;
    seenTeams.add(slot.teamId);
    return true;
  });

  const recentTrades = tradeRows.slice(0, 5);

  const featured = getFeaturedArticle();
  const headlines = getHeadlineStrip(6);
  const coverage = getCoverageArticles(6);
  const steelersIntel = getTeamArticles("PIT", 3);

  const favoriteTeam = session?.user?.favoriteTeam?.abbreviation ?? null;

  return (
    <main className="bg-white">
      {/* 1. LIVE COUNTDOWN TICKER */}
      <DraftCountdown />

      {/* 2. PERSONAL STATUS STRIP */}
      {session?.user && (
        <PersonalStatusStrip
          name={session.user.name ?? "You"}
          image={session.user.image ?? null}
          teamAbbr={favoriteTeam}
          primaryPool={primaryPool}
          leaderName={poolLeader?.userName ?? null}
          boardPickCount={userBoardPickCount}
          boardTotalPicks={32}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-10">
        {/* 3. HERO SPLIT */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr] lg:gap-6">
          <HeroFeature article={featured} />
          <HeadlinesSidebar items={headlines} />
        </section>

        {/* 4. LATEST DRAFT COVERAGE */}
        <section>
          <SectionHeader title="Latest Draft Coverage" viewAllHref="#" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.map((c) => (
              <CoverageCard key={c.id} article={c} />
            ))}
          </div>
        </section>

        {/* 5. TEAM-SPECIFIC: STEELERS INTEL */}
        <section>
          <SectionHeader title="Pittsburgh Steelers Intel" viewAllHref="#" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {steelersIntel.map((c) => (
              <CoverageCard key={c.id} article={c} />
            ))}
          </div>
        </section>

        {/* 6. YOUR POOL */}
        {session?.user && primaryPool && (
          <section>
            <SectionHeader title="Your Pool" viewAllHref="/pools" />
            <PoolSummary
              poolName={primaryPool.poolName}
              memberCount={memberCount}
              leaderName={poolLeader?.userName ?? null}
              leaderScore={poolLeader?.combinedScore ?? null}
              yourRank={userStanding?.rank ?? null}
              yourScore={userStanding?.combinedScore ?? null}
              poolId={primaryPool.poolId}
            />
          </section>
        )}

        {/* 7. TOP MOCK DRAFTS — existing data, restyled */}
        <section>
          <SectionHeader title="Top Mock Drafts" viewAllHref="/mock-drafts" />
          {leaderboard.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No published mock drafts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leaderboard.map((b, i) => (
                <LeaderboardCard
                  key={b.boardId}
                  rank={i + 1}
                  boardId={b.boardId}
                  title={b.title}
                  userName={b.userName}
                  userImage={b.userImage}
                  grade={b.grade.letterGrade}
                  summary={b.grade.summary}
                  pickCount={b.grade.totalPicks}
                />
              ))}
            </div>
          )}
        </section>

        {/* 8. TEAM NEEDS GRID — existing data, restyled */}
        <section>
          <SectionHeader title="Team Needs" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
            {teamsInOrder.map((t) => {
              const topNeeds = (t.teamNeeds ?? []).slice(0, 3);
              return (
                <div
                  key={t.teamId}
                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                  style={{ borderLeft: `4px solid ${t.teamPrimaryColor || "#D8DCE6"}` }}
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
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
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

        {/* 9. RECENT TRADES — existing data, restyled */}
        <section>
          <SectionHeader title="Recent Trades" viewAllHref="/trades" />
          {recentTrades.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No trades yet this season.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden shadow-sm">
              {recentTrades.map((tr) => (
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
                      {tr.tradeNote && (
                        <span className="text-[var(--text-muted)]"> &middot; {tr.tradeNote}</span>
                      )}
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
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function SectionHeader({ title, viewAllHref }: { title: string; viewAllHref?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-gray-200 pb-2">
      <h2
        className="text-xl sm:text-2xl tracking-wide text-[var(--text-primary)] uppercase"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-primary)] hover:underline"
        >
          View All →
        </Link>
      )}
    </div>
  );
}

function CategoryChip({ article }: { article: DraftContent }) {
  const theme = article.teamAbbr ? getTeamTheme(article.teamAbbr) : null;
  const bg = theme?.primary ?? "#1a1a2e";
  const fg = theme?.textOnPrimary ?? "white";
  return (
    <span
      className="inline-flex rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
      style={{ backgroundColor: bg, color: fg }}
    >
      {article.category}
    </span>
  );
}

function TeamGradient({
  teamAbbr,
  size = "md",
}: {
  teamAbbr?: string;
  size?: "sm" | "md" | "lg";
}) {
  const theme = teamAbbr ? getTeamTheme(teamAbbr) : null;
  const primary = theme?.primary ?? "#1a1a2e";
  const secondary = theme?.secondary ?? "#4a4a68";
  const label = theme?.abbreviation ?? "DRAFT";
  const fontSize = size === "lg" ? "7rem" : size === "sm" ? "2.5rem" : "4rem";

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
    >
      {/* diagonal stripe accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 18px, rgba(255,255,255,0.18) 18px, rgba(255,255,255,0.18) 36px)",
        }}
        aria-hidden
      />
      <span
        className="pointer-events-none select-none font-bold text-white/15"
        style={{
          fontFamily: "var(--font-display)",
          fontSize,
          letterSpacing: "0.08em",
        }}
        aria-hidden
      >
        {label}
      </span>
    </div>
  );
}

function HeroFeature({ article }: { article: DraftContent }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[16/9] w-full">
        <TeamGradient teamAbbr={article.teamAbbr} size="lg" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <CategoryChip article={article} />
        <h3
          className="text-xl sm:text-2xl leading-tight text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {article.headline}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {article.subtext}
        </p>
        <p className="mt-auto pt-2 text-[11px] text-[var(--text-muted)]">
          {article.author} &middot; Updated {article.timestamp}
        </p>
      </div>
    </article>
  );
}

function HeadlinesSidebar({ items }: { items: DraftContent[] }) {
  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3
        className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.15em" }}
      >
        Top Headlines
      </h3>
      <ul className="space-y-2.5">
        {items.map((h) => {
          const theme = h.teamAbbr ? getTeamTheme(h.teamAbbr) : null;
          const accent = theme?.primary ?? "#CC0000";
          return (
            <li key={h.id} className="border-l-2 pl-3" style={{ borderColor: accent }}>
              <Link
                href="#"
                className="block text-sm font-semibold leading-snug text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
              >
                {h.headline}
              </Link>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                {h.category} &middot; {h.timestamp}
              </p>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function CoverageCard({ article }: { article: DraftContent }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[16/9] w-full">
        <TeamGradient teamAbbr={article.teamAbbr} size="md" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <CategoryChip article={article} />
        <h4 className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)]">
          {article.headline}
        </h4>
        <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">{article.subtext}</p>
        <p className="mt-auto pt-1 text-[10px] text-[var(--text-muted)]">
          {article.author} &middot; {article.timestamp}
        </p>
      </div>
    </article>
  );
}

function PersonalStatusStrip({
  name,
  image,
  teamAbbr,
  primaryPool,
  leaderName,
  boardPickCount,
  boardTotalPicks,
}: {
  name: string;
  image: string | null;
  teamAbbr: string | null;
  primaryPool: { poolId: string; poolName: string } | null;
  leaderName: string | null;
  boardPickCount: number;
  boardTotalPicks: number;
}) {
  const theme = teamAbbr ? getTeamTheme(teamAbbr) : null;
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="w-full border-b border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        {/* Left: identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          {image ? (
            <Image
              src={image}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: theme?.primary ?? "#4a4a68" }}
            >
              {initials || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{name}</p>
            <p className="truncate text-[10px] text-[var(--text-muted)]">
              {primaryPool ? primaryPool.poolName : "Not in a pool"}
            </p>
          </div>
        </div>

        {/* Center: quick stats */}
        <div className="flex flex-1 flex-wrap items-center gap-3 text-[11px] sm:justify-center sm:gap-5">
          <Link
            href="/my-board"
            className="flex items-center gap-1.5 rounded px-1 hover:text-[var(--accent-primary)]"
          >
            <span className="font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Your Board
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {boardPickCount}/{boardTotalPicks}
            </span>
          </Link>
          {primaryPool ? (
            <div className="flex items-center gap-1.5 rounded px-1">
              <span className="font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Pool Leader
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {leaderName ?? "—"}
              </span>
            </div>
          ) : (
            <Link
              href="/pools"
              className="rounded-full bg-[var(--accent-primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-text)] hover:brightness-95"
            >
              Join a Pool
            </Link>
          )}
        </div>

        {/* Right: CTA */}
        <Link
          href="/my-board"
          className="flex shrink-0 items-center justify-center gap-1 self-end rounded bg-[var(--text-primary)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-black sm:self-auto"
        >
          My Board
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

function PoolSummary({
  poolName,
  memberCount,
  leaderName,
  leaderScore,
  yourRank,
  yourScore,
  poolId,
}: {
  poolName: string;
  memberCount: number;
  leaderName: string | null;
  leaderScore: number | null;
  yourRank: number | null;
  yourScore: number | null;
  poolId: string;
}) {
  return (
    <div className="flex flex-col items-stretch gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-lg uppercase tracking-wide text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {poolName}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </div>
      <div className="flex gap-6 sm:gap-8">
        <PoolStat label="Leader" primary={leaderName ?? "—"} secondary={leaderScore != null ? `${leaderScore} pts` : ""} />
        <PoolStat
          label="You"
          primary={yourRank != null ? `#${yourRank}` : "—"}
          secondary={yourScore != null ? `${yourScore} pts` : ""}
        />
      </div>
      <Link
        href={`/pools/${poolId}`}
        className="flex shrink-0 items-center justify-center rounded bg-[var(--text-primary)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-black"
      >
        View Pool →
      </Link>
    </div>
  );
}

function PoolStat({ label, primary, secondary }: { label: string; primary: string; secondary: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-sm font-bold text-[var(--text-primary)]">{primary}</p>
      {secondary && <p className="text-[10px] text-[var(--text-muted)]">{secondary}</p>}
    </div>
  );
}

function LeaderboardCard({
  rank,
  boardId,
  title,
  userName,
  userImage,
  grade,
  summary,
  pickCount,
}: {
  rank: number;
  boardId: string;
  title: string;
  userName: string | null;
  userImage: string | null;
  grade: LetterGrade;
  summary: string;
  pickCount: number;
}) {
  const medalColor =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#E8ECF4";

  return (
    <Link
      href={`/picks/${boardId}`}
      className="group flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
          style={{ backgroundColor: medalColor, color: "#1a1a2e" }}
        >
          {rank}
        </span>
        {userImage ? (
          <Image
            src={userImage}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-[var(--text-muted)]">
            {(userName || "?").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
            {title}
          </p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {userName ?? "Unknown"} &middot; {pickCount} picks
          </p>
        </div>
        <PickGradeBadge grade={grade} size="md" />
      </div>
      <p className="line-clamp-2 text-xs italic text-[var(--text-secondary)]">{summary}</p>
    </Link>
  );
}

