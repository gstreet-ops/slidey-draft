import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";
import { DisplayNameForm } from "@/components/display-name-form";
import { TeamImage } from "@/components/team-image";
import { InnerPageHeader } from "@/components/inner-page-header";
import { getTeamTheme } from "@/lib/team-themes";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      abbreviation: teams.abbreviation,
      primaryColor: teams.primaryColor,
      logoUrl: teams.logoUrl,
    })
    .from(teams)
    .orderBy(asc(teams.name));

  const currentTeam = session.user.favoriteTeam;
  const currentName = session.user.name ?? "";
  const teamCode = currentTeam?.abbreviation ?? null;
  const theme = getTeamTheme(teamCode);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <InnerPageHeader title="SETTINGS" subtitle="Profile, team theme, and display preferences" teamCode={teamCode} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Profile */}
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-8">
          <h2
            className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PROFILE
          </h2>
          <div className="mt-4">
            <DisplayNameForm initialName={currentName} />
          </div>
        </section>

        {/* Team Theme — selected team rich preview */}
        {currentTeam && (
          <section className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
            <div
              className="flex items-stretch gap-4 p-5 sm:gap-6 sm:p-6"
              style={{
                background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.primary} 35%, transparent 100%)`,
              }}
            >
              <TeamImage
                teamCode={teamCode}
                variant="logo"
                size={80}
                fallback="initials"
                className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
              />
              <div className="flex-1 min-w-0 self-center">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/85"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}
                >
                  Your Team
                </p>
                <h3
                  className="mt-0.5 text-2xl sm:text-3xl leading-none tracking-wide text-white"
                  style={{
                    fontFamily: "var(--font-display)",
                    textShadow: "0 1px 8px rgba(0,0,0,0.45)",
                  }}
                >
                  {theme.name.toUpperCase()}
                </h3>
                <p
                  className="mt-1.5 text-xs sm:text-sm text-white/85"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.45)" }}
                >
                  {theme.tagline}
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Color swatches + meta */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Your Team Colors
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-9 w-9 rounded-md border border-gray-200 shrink-0"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{theme.primary}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-9 w-9 rounded-md border border-gray-200 shrink-0"
                      style={{ backgroundColor: theme.secondary }}
                    />
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{theme.secondary}</span>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Stadium</dt>
                    <dd className="mt-0.5 text-[var(--text-primary)] font-medium">{theme.stadium}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Division</dt>
                    <dd className="mt-0.5 text-[var(--text-primary)] font-medium">{theme.division}</dd>
                  </div>
                </dl>
              </div>

              {/* Wordmark */}
              {theme.wordmark && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Wordmark</p>
                  <div className="mt-2 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={theme.wordmark} alt={`${theme.name} wordmark`} className="h-8 w-auto object-contain" />
                  </div>
                </div>
              )}

              {/* Alt logo */}
              {theme.altLogo && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Alternate Logo</p>
                  <div className="mt-2 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                    <TeamImage teamCode={teamCode} variant="altLogo" size={56} />
                  </div>
                </div>
              )}

              {/* Image gallery — only renders sections that have images */}
              <ImageTile teamCode={teamCode} variant="heroPlayer" label="Roster Highlight" present={!!theme.heroPlayer} accent={theme.primary} />
              <ImageTile teamCode={teamCode} variant="legendPlayer" label="Franchise Legend" present={!!theme.legendPlayer} accent={theme.primary} />
              <ImageTile teamCode={teamCode} variant="historyImage" label="Team History" present={!!theme.historyImage} accent={theme.primary} />
              <ImageTile teamCode={teamCode} variant="actionShot" label="Game Day" present={!!theme.actionShot} accent={theme.primary} />
              <ImageTile teamCode={teamCode} variant="funImage" label="Fan Culture" present={!!theme.funImage} accent={theme.primary} />
            </div>
          </section>
        )}

        {/* Team grid */}
        <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-8">
          <h2
            className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {currentTeam ? "CHANGE TEAM" : "PICK YOUR TEAM"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            All 32 NFL teams. Default is Pittsburgh (this year&apos;s host city).
          </p>
          <div className="mt-5">
            <TeamPicker
              teams={allTeams.map((t) => ({
                ...t,
                primaryColor: t.primaryColor || "#FFB612",
              }))}
              selectedTeamId={currentTeam?.id}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ImageTile({
  teamCode,
  variant,
  label,
  present,
  accent,
}: {
  teamCode: string | null;
  variant: "heroPlayer" | "legendPlayer" | "historyImage" | "actionShot" | "funImage";
  label: string;
  present: boolean;
  accent: string;
}) {
  if (!present) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <div
        className="mt-2 h-40 sm:h-44 rounded-lg overflow-hidden border-2"
        style={{ borderColor: accent }}
      >
        <TeamImage teamCode={teamCode} variant={variant} size={500} className="!h-full !w-full !object-cover" />
      </div>
    </div>
  );
}
