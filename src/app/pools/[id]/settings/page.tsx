import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPoolById, getPoolMembers } from "@/lib/queries";
import { canManagePool, getPoolRole, getPoolSettings } from "@/lib/pool-helpers";
import { PoolSettingsForm } from "./settings-form";
import { MemberManagement } from "./member-management";

export const dynamic = "force-dynamic";

export default async function PoolSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const pool = await getPoolById(poolId);
  if (!pool) notFound();

  const allowed = await canManagePool(session.user.id, poolId);
  if (!allowed) redirect(`/pools/${poolId}`);

  const myRole = await getPoolRole(session.user.id, poolId);
  const members = await getPoolMembers(poolId);
  const settings = getPoolSettings(pool.settings);

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href={`/pools/${poolId}`} className="text-white/60 hover:text-white transition">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        <h1 className="text-3xl font-bold text-white">Pool Settings</h1>

        <PoolSettingsForm
          poolId={poolId}
          poolName={pool.name}
          poolDescription={(pool.description as string) || ""}
          settings={settings}
          isCommissioner={myRole === "commissioner"}
        />

        <MemberManagement
          poolId={poolId}
          members={members}
          myRole={myRole!}
          myUserId={session.user.id}
        />
      </main>
    </div>
  );
}
