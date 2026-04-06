import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Admin only
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if ((session.user as any).role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      {/* Admin header bar */}
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-xl font-bold tracking-wide text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              DAN&apos;S PICKS STUDIO
            </Link>
            <nav className="flex gap-4 text-sm text-white/60">
              <Link href="/admin" className="hover:text-white transition">
                Boards
              </Link>
              <Link href="/admin/live" className="hover:text-white transition">
                Live
              </Link>
              <Link href="/leaderboard" className="hover:text-white transition">
                Leaderboard
              </Link>
              <Link href="/" className="hover:text-white transition">
                View Site
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[var(--lions-blue)] flex items-center justify-center text-white text-xs font-bold">
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "D"}
            </div>
            <span className="text-sm text-white/80">
              {session.user.name || session.user.email}
            </span>
          </div>
        </div>
      </header>

      {/* Admin content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
