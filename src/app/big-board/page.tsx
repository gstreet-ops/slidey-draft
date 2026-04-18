import Image from "next/image";
import { getPlayers } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { InnerPageHeader } from "@/components/inner-page-header";
import { BigBoardClient } from "./big-board-client";
import { getTeamTheme } from "@/lib/team-themes";

export const dynamic = "force-dynamic";

export default async function BigBoardPage() {
  const session = await auth();
  const allPlayers = await getPlayers();
  const ranked = allPlayers.filter((p) => p.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const teamCode = session?.user?.favoriteTeam?.abbreviation ?? null;
  const theme = getTeamTheme(teamCode);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <InnerPageHeader
        title="BIG BOARD"
        subtitle={`2026 NFL Draft Prospects · ${ranked.length} ranked`}
        teamCode={teamCode}
      />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Team Spotlight — only when team has an action shot */}
        {theme.actionShot && (
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-200 border-l-4 border-l-[var(--accent-primary)] bg-white p-4 shadow-sm">
            <div
              className="h-20 w-20 shrink-0 rounded-lg overflow-hidden border"
              style={{ borderColor: theme.primary }}
            >
              <Image
                src={theme.actionShot}
                alt={`${theme.name} game day`}
                width={160}
                height={160}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                Team Spotlight
              </p>
              <p
                className="mt-0.5 text-base sm:text-lg font-bold text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Game Day at {theme.stadium}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Scouting prospects who could land in {theme.city}.
              </p>
            </div>
          </div>
        )}

        <BigBoardClient prospects={ranked} isLoggedIn={!!session?.user} />
      </main>

      <SiteFooter />
    </div>
  );
}
