import { redirect } from "next/navigation";
import { getDraftOrder, getPlayers, getActualResults } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { LiveResultsEntry } from "./live-entry";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");

  const season = 2026;
  const draftOrder = await getDraftOrder(season);
  const allPlayers = await getPlayers();
  const results = await getActualResults(season);

  // Players already drafted
  const draftedPlayerIds = new Set(results.map((r) => r.playerId));
  const availablePlayers = allPlayers.filter((p) => !draftedPlayerIds.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-[var(--text-primary)] tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            DRAFT NIGHT LIVE
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {results.length}/32 picks entered &middot; 2026 NFL Draft
          </p>
        </div>
        {results.length > 0 && (
          <div className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-bold text-red-700 animate-pulse">
            LIVE
          </div>
        )}
      </div>

      <LiveResultsEntry
        season={season}
        draftOrder={draftOrder}
        availablePlayers={availablePlayers}
        existingResults={results}
      />
    </div>
  );
}
