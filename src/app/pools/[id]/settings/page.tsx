import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPoolById, getPoolMembers } from "@/lib/queries";
import { canManagePool, getPoolRole, getPoolSettings } from "@/lib/pool-helpers";
import { PoolSettingsForm } from "./settings-form";
import { MemberManagement } from "./member-management";
import { PoolThemeSettings } from "@/components/pool-theme-settings";
import { PoolTeamManager } from "@/components/pool-team-manager";
import { PoolLockControl } from "@/components/pool-lock-control";

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

        {myRole === "commissioner" && (
          <PoolLockControl poolId={poolId} status={pool.status} />
        )}

        <PoolSettingsForm
          poolId={poolId}
          poolName={pool.name}
          poolDescription={(pool.description as string) || ""}
          settings={settings}
          isCommissioner={myRole === "commissioner"}
        />

        {myRole === "commissioner" && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Pool Theme</h2>
            <PoolThemeSettings
              poolId={poolId}
              currentPrimary={pool.primaryColor}
              currentSecondary={pool.secondaryColor}
            />
          </section>
        )}

        {myRole === "commissioner" && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Teams</h2>
            <PoolTeamManager
              poolId={poolId}
              poolMembers={members.map((m) => ({
                userId: m.userId,
                userName: m.userName || m.userEmail || "Unknown",
              }))}
            />
          </section>
        )}

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
