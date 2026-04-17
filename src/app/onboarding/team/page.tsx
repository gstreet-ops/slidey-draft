import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { TeamPicker } from "@/components/team-picker";
import { SoundPreference } from "@/components/sound-preference";

export const dynamic = "force-dynamic";

export default async function OnboardingTeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (session.user.favoriteTeam) redirect("/dashboard");

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--steelers-black)] px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <h1
          className="text-4xl font-bold text-white tracking-wider sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PICK YOUR TEAM
        </h1>
        <p className="mt-3 text-white/50 text-sm">
          Choose your favorite NFL team to personalize your experience.
        </p>

        <div className="mt-8">
          <TeamPicker
            teams={allTeams.map((t) => ({
              ...t,
              primaryColor: t.primaryColor || "#FFB612",
            }))}
            redirectTo="/dashboard"
          />
        </div>

        <div className="mt-8 max-w-sm mx-auto">
          <SoundPreference />
        </div>

        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-white/40 hover:text-white/50 transition"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
