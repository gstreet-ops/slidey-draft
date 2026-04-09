import Link from "next/link";
import Image from "next/image";
import { getBoards } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users, teams } from "@/db/schema";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const boards = await getBoards(2026);
  const published = boards.filter((b) => b.status === "published");
  const session = await auth();

  // Enrich boards with creator info
  const enrichedBoards = await Promise.all(
    published.map(async (board) => {
      if (!board.createdBy) return { ...board, creator: null, team: null };
      const [creator] = await db
        .select({ name: users.name, email: users.email, role: users.role, favoriteTeamId: users.favoriteTeamId })
        .from(users)
        .where(eq(users.id, board.createdBy));
      let team = null;
      if (creator?.favoriteTeamId) {
        const [t] = await db.select({ logoUrl: teams.logoUrl, primaryColor: teams.primaryColor, abbreviation: teams.abbreviation })
          .from(teams).where(eq(teams.id, creator.favoriteTeamId));
        team = t || null;
      }
      return { ...board, creator: creator || null, team };
    })
  );

  const allBoards = enrichedBoards;

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <MobileNav
        links={[
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/live", label: "Live" },
          session?.user
            ? { href: "/my-board", label: "My Board" }
            : { href: "/login", label: "Sign In" },
        ]}
        logo={
          <Link href="/" className="text-lg font-bold text-white tracking-wider sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1
          className="text-4xl font-bold text-white tracking-wide text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MOCK DRAFTS
        </h1>
        <p className="mt-2 text-center text-white/50">
          2026 NFL Mock Draft Boards
        </p>

        {allBoards.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {allBoards.map((board) => (
              <Link
                key={board.id}
                href={`/picks/${board.id}`}
                className="group rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition"
                style={board.team?.primaryColor ? { borderLeft: `4px solid ${board.team.primaryColor}` } : undefined}
              >
                <div className="flex items-center gap-3">
                  {board.team?.logoUrl && (
                    <Image src={board.team.logoUrl} alt={board.team.abbreviation || ""} width={28} height={28} className="shrink-0 object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-[var(--lions-blue)] transition">
                      {board.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {board.creator?.name || board.creator?.email || "Anonymous"} &middot;
                      Published {board.publishedAt?.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {published.length === 0 && (
          <div className="mt-12 rounded-xl bg-white/10 p-12 text-center">
            <p className="text-white/50 text-lg">No published boards yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
