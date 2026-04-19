import Link from "next/link";
import { TeamImage } from "@/components/team-image";
import { getTrades } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatDetectedAt(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${ET_FORMATTER.format(date)} ET`;
}

export default async function TradesPage() {
  const season = 2026;
  const allTrades = await getTrades(season);
  const mostRecent = allTrades[0]?.detectedAt ?? null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Neutral page header — team-color independent so trade arrows and
          source badges stay legible for every user. */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-wide text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TRADE TRACKER
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Draft order changes as trades happen.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {allTrades.length === 0
              ? "No trades detected yet."
              : `${allTrades.length} trade${allTrades.length === 1 ? "" : "s"} recorded · latest ${formatDetectedAt(mostRecent as Date)}`}
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/mock-drafts"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Mock Drafts
        </Link>

        {allTrades.length === 0 ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-base font-semibold text-gray-700">
              No trades detected yet.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              The draft order hasn&apos;t changed since it was last recorded. This page
              will update automatically as picks are swapped.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {allTrades.map((t) => (
              <li
                key={t.id}
                id={`trade-${t.id}`}
                className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xl font-bold text-gray-900 sm:text-2xl tabular-nums"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    #{t.pickNumber}
                  </span>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamImage
                      teamCode={t.previousTeamAbbreviation}
                      variant="logo"
                      size={28}
                      fallback="initials"
                      className="h-7 w-7 shrink-0 opacity-60"
                      alt={t.previousTeamName}
                    />
                    <span className="text-sm font-semibold text-gray-500 line-through">
                      {t.previousTeamAbbreviation}
                    </span>
                    <span className="text-gray-400" aria-hidden>
                      →
                    </span>
                    <TeamImage
                      teamCode={t.newTeamAbbreviation}
                      variant="logo"
                      size={28}
                      fallback="initials"
                      className="h-7 w-7 shrink-0"
                      alt={t.newTeamName}
                    />
                    <span className="text-sm font-bold text-gray-900">
                      {t.newTeamAbbreviation}
                    </span>
                  </div>

                  <span
                    className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      t.source === "espn_sync"
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}
                  >
                    {t.source === "espn_sync" ? "ESPN Sync" : "Manual"}
                  </span>
                </div>

                {t.tradeNote && (
                  <p className="mt-2 text-sm text-gray-700">{t.tradeNote}</p>
                )}

                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-500 sm:text-xs">
                  <span>Detected {formatDetectedAt(t.detectedAt as Date)}</span>
                  <span className="sm:hidden rounded-full bg-gray-100 px-2 py-0.5 font-semibold uppercase tracking-wider">
                    {t.source === "espn_sync" ? "ESPN" : "Manual"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
