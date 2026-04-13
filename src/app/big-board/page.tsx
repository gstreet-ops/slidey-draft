import { getPlayers } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { BigBoardClient } from "./big-board-client";

export const dynamic = "force-dynamic";

export default async function BigBoardPage() {
  const session = await auth();
  const allPlayers = await getPlayers();
  const ranked = allPlayers.filter((p) => p.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <h1
          className="text-3xl font-bold text-white tracking-wide sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PROSPECTS
        </h1>
        <p className="mt-1 text-sm text-white/50 mb-6">
          2026 NFL Draft prospect rankings &middot; {ranked.length} prospects
        </p>

        <BigBoardClient prospects={ranked} isLoggedIn={!!session?.user} />
      </main>

      <SiteFooter isAdmin={session?.user?.role === "admin"} />
    </div>
  );
}
