import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";
import { DisplayNameForm } from "@/components/display-name-form";

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

  return (
    <div className="min-h-screen bg-[var(--steelers-black)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1
          className="text-3xl font-bold text-white tracking-wider"
          style={{ fontFamily: "var(--font-display)" }}
        >
          SETTINGS
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Manage how you appear and which team colors light up the app for you.
        </p>

        {/* Profile */}
        <section className="mt-8 rounded-xl border border-white/10 bg-[var(--surface-dark)] p-5 sm:p-8">
          <h2
            className="text-lg font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PROFILE
          </h2>
          <div className="mt-4">
            <DisplayNameForm initialName={currentName} />
          </div>
        </section>

        {/* Team Theme */}
        <section className="mt-6 rounded-xl border border-white/10 bg-[var(--surface-dark)] p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-lg font-bold text-white tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                TEAM THEME
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Pick your team — accents across the app will switch to its colors. Default is Pittsburgh (this year&apos;s host city).
              </p>
            </div>
            {currentTeam && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-card)] px-3 py-2 shrink-0">
                {currentTeam.logoUrl ? (
                  <Image
                    src={currentTeam.logoUrl}
                    alt={currentTeam.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: currentTeam.primaryColor }}
                  >
                    {currentTeam.abbreviation}
                  </div>
                )}
                <span className="text-xs font-semibold text-white">{currentTeam.abbreviation}</span>
              </div>
            )}
          </div>
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
