import Link from "next/link";
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
import { getPoolsForUser } from "@/lib/queries";

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

  const isAdmin = session.user.role === "admin";
  const isCommissioner = session.user.role === "commissioner" || isAdmin;
  const userPools = isCommissioner ? await getPoolsForUser(session.user.id) : [];
  const myCommissionerPools = userPools.filter(
    (p) => p.role === "commissioner" || p.role === "admin"
  );

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

        {/* Team Theme — header banner + colors + stadium/division */}
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
                size={64}
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

            <div className="p-5 sm:p-6">
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

        {/* Your Pools (commissioner+) */}
        {isCommissioner && (
          <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-8">
            <h2
              className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              YOUR POOLS
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Manage your pools and invite players.
            </p>
            {myCommissionerPools.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {myCommissionerPools.map((p) => (
                  <div
                    key={p.poolId}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">{p.poolName}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{p.role}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/pools/${p.poolId}`}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)] transition"
                      >
                        View
                      </Link>
                      <Link
                        href={`/pools/${p.poolId}/settings`}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)] transition"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                You haven&apos;t created or joined any pools as commissioner yet.
              </p>
            )}
            <div className="mt-4">
              <Link
                href="/pools/create"
                className="inline-block rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
              >
                + Create New Pool
              </Link>
            </div>
          </section>
        )}

        {/* Administration (admin only) */}
        {isAdmin && (
          <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-8">
            <h2
              className="text-lg font-bold text-[var(--text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ADMINISTRATION
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Pool management, commissioner tools, and app settings.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
              >
                Go to Admin Dashboard <span aria-hidden>→</span>
              </Link>
              <Link
                href="/admin/trivia"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)] transition"
              >
                Trivia Manager
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
