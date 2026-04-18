import { getPlayers } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { InnerPageHeader } from "@/components/inner-page-header";
import { BigBoardClient } from "./big-board-client";

export const dynamic = "force-dynamic";

export default async function BigBoardPage() {
  const session = await auth();
  const allPlayers = await getPlayers();
  const ranked = allPlayers.filter((p) => p.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const teamCode = session?.user?.favoriteTeam?.abbreviation ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <InnerPageHeader
        title="BIG BOARD"
        subtitle={`2026 NFL Draft Prospects · ${ranked.length} ranked`}
        teamCode={teamCode}
      />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <BigBoardClient prospects={ranked} isLoggedIn={!!session?.user} />
      </main>

      <SiteFooter />
    </div>
  );
}
