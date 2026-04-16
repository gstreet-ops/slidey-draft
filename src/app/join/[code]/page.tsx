import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { poolInviteCodes } from "@/db/schema";
import { getPoolByInviteCode, getPoolMemberCount, isPoolMember } from "@/lib/queries";
import { JoinPoolButton } from "@/app/pools/join/[inviteCode]/join-button";
import { SmartSignInButtonClient } from "./sign-in-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SmartJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  // Check if this is a single-use code that's been used or revoked
  const normalized = code.toUpperCase().trim();
  const [singleCode] = await db
    .select({ usedBy: poolInviteCodes.usedBy, revokedAt: poolInviteCodes.revokedAt, type: poolInviteCodes.type })
    .from(poolInviteCodes)
    .where(eq(poolInviteCodes.code, normalized));

  if (singleCode?.revokedAt) {
    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Invite Revoked</h1>
          <p className="text-white/60 text-sm">This invite is no longer valid.</p>
          <Link href="/" className="text-[var(--slidey)] hover:underline text-sm">Go Home</Link>
        </div>
      </div>
    );
  }

  if (singleCode?.type === "single" && singleCode.usedBy) {
    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Invite Already Used</h1>
          <p className="text-white/60 text-sm">This invite has already been claimed by another player.</p>
          <Link href="/" className="text-[var(--slidey)] hover:underline text-sm">Go Home</Link>
        </div>
      </div>
    );
  }

  const pool = await getPoolByInviteCode(code);

  if (!pool) {
    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Pool Not Found</h1>
          <p className="text-white/60 text-sm">This invite link is invalid or expired.</p>
          <Link href="/" className="text-[var(--slidey)] hover:underline text-sm">Go Home</Link>
        </div>
      </div>
    );
  }

  // Signed in and already a member — redirect to pool
  if (session?.user?.id) {
    const isMember = await isPoolMember(pool.id, session.user.id);
    if (isMember) {
      redirect(`/pools/${pool.id}`);
    }
  }

  const memberCount = await getPoolMemberCount(pool.id);
  const commissionerName = pool.commissionerName || "The commissioner";

  // Signed in and active — show join confirmation
  if (session?.user?.id && session.user.status === "active") {
    if (pool.status !== "open") {
      return (
        <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">{pool.name}</h1>
            <p className="text-white/60 text-sm">This pool is no longer accepting members.</p>
            <Link href="/" className="text-[var(--slidey)] hover:underline text-sm">Go Home</Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Join {pool.name}?</h1>
          {pool.description && <p className="text-white/50 text-sm">{pool.description as string}</p>}
          <div className="flex items-center justify-center gap-4 text-sm text-white/40">
            <span>{commissionerName}</span>
            <span>&middot;</span>
            <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
          </div>
          <JoinPoolButton inviteCode={code} poolId={pool.id} />
        </div>
      </div>
    );
  }

  // Signed in but spectator — need activation via pool join
  if (session?.user?.id && session.user.status !== "active") {
    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Join {pool.name}</h1>
          <p className="text-white/50 text-sm">
            Joining this pool will activate your account and give you full access.
          </p>
          <div className="text-sm text-white/40">
            {memberCount} member{memberCount !== 1 ? "s" : ""} &middot; {commissionerName}
          </div>
          <JoinPoolButton inviteCode={code} poolId={pool.id} />
        </div>
      </div>
    );
  }

  // Not signed in — smart landing page
  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-3">
          <div className="inline-block rounded-full bg-[var(--lions-blue)]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--lions-blue)]">
            Pool Invite
          </div>
          <h1
            className="text-3xl font-bold text-white tracking-wide sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            YOU&apos;RE INVITED TO<br /><span className="text-[var(--slidey)]">{pool.name.toUpperCase()}</span>
          </h1>
          <p className="text-sm text-white/50">
            {commissionerName} and {memberCount > 1 ? `${memberCount - 1} other${memberCount > 2 ? "s" : ""}` : "others"} are waiting for you
          </p>
        </div>

        <div className="space-y-4 text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-xs font-bold text-[var(--lions-blue)]">1</span>
            <div>
              <p className="text-sm font-semibold text-white">Sign in with Google</p>
              <p className="text-xs text-white/40">One click — no password needed</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-xs font-bold text-[var(--lions-blue)]">2</span>
            <div>
              <p className="text-sm font-semibold text-white">Make your mock draft picks</p>
              <p className="text-xs text-white/40">Predict the first round before draft night</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--lions-blue)]/20 text-xs font-bold text-[var(--lions-blue)]">3</span>
            <div>
              <p className="text-sm font-semibold text-white">Compete live on draft night</p>
              <p className="text-xs text-white/40">Predict picks, answer trivia, climb the leaderboard</p>
            </div>
          </div>
        </div>

        <SmartSignInButton code={code} />

        <div className="space-y-2">
          <p className="text-xs text-white/30">
            What is Slidey Draft? A fantasy draft competition where you predict NFL Draft picks, compete in trivia, and race your friends up the leaderboard — all live on draft night.
          </p>
          <p className="text-xs text-white/30">
            Want to explore first?{" "}
            <Link href="/" className="text-[var(--slidey)] hover:underline">Visit the home page</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SmartSignInButton({ code }: { code: string }) {
  return <SmartSignInButtonClient code={code} />;
}
