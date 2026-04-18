import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Logged-in users only — non-admins can still see the "Create Your Own Pool" section
  // on the /admin index page. Admin-only subroutes guard themselves.
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-[var(--steelers-black)]">
      {isAdmin && (
        <div className="border-b border-[var(--border-light)] bg-black/10">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 py-1.5 text-xs">
            <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider mr-3">Admin</span>
            <Link href="/admin" className="rounded px-2.5 py-1 text-[var(--text-muted)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition">Pools</Link>
            <Link href="/admin/trivia" className="rounded px-2.5 py-1 text-[var(--text-muted)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition">Trivia</Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
