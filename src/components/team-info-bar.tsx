import { db } from "@/db";
import { teams as teamsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTeamTheme } from "@/lib/team-themes";

type Props = {
  teamCode?: string | null;
};

/**
 * Server component. Below the hero banner — shows team abbreviation, name,
 * stadium/division, and the team's positional needs from the DB.
 */
export async function TeamInfoBar({ teamCode }: Props) {
  const theme = getTeamTheme(teamCode);

  const [teamRow] = await db
    .select({ needs: teamsTable.needs })
    .from(teamsTable)
    .where(eq(teamsTable.abbreviation, theme.abbreviation));

  const needs = teamRow?.needs ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="-mt-6 sm:-mt-8 relative z-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          {/* Abbreviation block */}
          <div
            className="shrink-0 rounded-lg flex flex-col items-center justify-center px-5 py-3"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              color: theme.textOnPrimary === "black" ? "#101820" : "#FFFFFF",
              minWidth: 96,
            }}
          >
            <span
              className="text-3xl sm:text-4xl leading-none tracking-wider"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {theme.abbreviation}
            </span>
            <span className="mt-1 text-[9px] font-semibold tracking-widest uppercase opacity-80">
              {theme.division}
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg sm:text-xl font-bold tracking-wide text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {theme.name.toUpperCase()}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
              {theme.stadium} · {theme.city}
            </p>
            {needs.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Draft Needs
                </span>
                {needs.slice(0, 6).map((need) => (
                  <span
                    key={need}
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider"
                    style={{
                      backgroundColor: "var(--accent-light)",
                      color: "var(--accent-secondary)",
                    }}
                  >
                    {need}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
