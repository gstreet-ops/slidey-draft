import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPoolByInviteCode, getPoolMemberCount, isPoolMember } from "@/lib/queries";
import { JoinPoolButton } from "./join-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinPoolPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const session = await auth();
  const pool = await getPoolByInviteCode(inviteCode);

  if (!pool) {
    return (
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Pool Not Found</h1>
          <p className="text-white/60">This invite link is invalid.</p>
          <Link href="/" className="text-[var(--steelers-gold)] hover:underline text-sm">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/pools/join/${inviteCode}`);
  }

  if (session.user.status !== "active") {
    return (
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/8 border border-white/[0.12] rounded-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{pool.name}</h1>
          <p className="text-white/60">
            You need an invite to participate. Enter your invite code or ask a friend for one.
          </p>
          <Link href="/" className="text-[var(--steelers-gold)] hover:underline text-sm">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const isMember = await isPoolMember(pool.id, session.user.id);
  if (isMember) {
    redirect(`/pools/${pool.id}`);
  }

  const memberCount = await getPoolMemberCount(pool.id);

  if (pool.status !== "open") {
    return (
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{pool.name}</h1>
          <p className="text-white/60">This pool is no longer accepting members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/8 border border-white/[0.12] rounded-xl p-8 text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">{pool.name}</h1>
        {pool.description && <p className="text-white/50 text-sm">{pool.description as string}</p>}
        <p className="text-white/50 text-sm">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
        <JoinPoolButton inviteCode={inviteCode} poolId={pool.id} />
      </div>
    </div>
  );
}
