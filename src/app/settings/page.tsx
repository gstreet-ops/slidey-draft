import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { MobileNav } from "@/components/mobile-nav";
import { TeamPicker } from "@/components/team-picker";

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

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <MobileNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/picks", label: "All Picks" },
          { href: "/leaderboard", label: "Leaderboard" },
        ]}
        logo={
          <Link
            href="/"
            className="text-lg font-bold text-white tracking-wider sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SLIDEY<span className="text-[var(--slidey)]">.COM</span> DRAFT
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1
          className="text-3xl font-bold text-white tracking-wider"
          style={{ fontFamily: "var(--font-display)" }}
        >
          SETTINGS
        </h1>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Your Team
          </h2>
          {currentTeam ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              {currentTeam.logoUrl ? (
                <Image
                  src={currentTeam.logoUrl}
                  alt={currentTeam.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: currentTeam.primaryColor }}
                >
                  {currentTeam.abbreviation}
                </div>
              )}
              <span className="text-white font-semibold">{currentTeam.name}</span>
            </div>
          ) : (
            <p className="mt-3 text-white/40 text-sm">No team selected</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            {currentTeam ? "Change Team" : "Pick a Team"}
          </h2>
          <TeamPicker
            teams={allTeams.map((t) => ({
              ...t,
              primaryColor: t.primaryColor || "#4A7AB5",
            }))}
            selectedTeamId={currentTeam?.id}
          />
        </section>
      </div>
    </div>
  );
}
