"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { claimCommissionerInvite } from "@/lib/actions";
import Link from "next/link";

export default function CommissionerInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((p) => setCode(p.code));
  }, [params]);

  // Set cookie before redirecting to sign-in
  function handleSignIn() {
    document.cookie = `slidey_pending_invite=${code}; path=/; max-age=600`;
    document.cookie = `slidey_invite_type=commissioner; path=/; max-age=600`;
    router.push(`/login?callbackUrl=/commissioner/${code}`);
  }

  async function handleClaim() {
    setClaiming(true);
    setError("");
    const result = await claimCommissionerInvite(code);
    if (result.success) {
      if (result.alreadyCommissioner) {
        router.push("/pools/create");
      } else {
        router.push(result.poolName ? `/pools/create?name=${encodeURIComponent(result.poolName)}` : "/pools/create");
      }
    } else {
      setError(result.message);
      setClaiming(false);
    }
  }

  if (status === "loading" || !code) {
    return (
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  // Signed out
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-3">
            <div className="inline-block rounded-full bg-[var(--slidey)]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--slidey)]">
              Commissioner Invite
            </div>
            <h1
              className="text-3xl font-bold text-white tracking-wide sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              RUN YOUR OWN<br />DRAFT POOL
            </h1>
            <p className="text-sm text-white/50 max-w-sm mx-auto">
              You&apos;ve been invited to run a draft pool on Slidey. As a commissioner, you&apos;ll create your pool, set the rules, invite your friends, and run draft night.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--slidey)]/20 text-xs font-bold text-[var(--slidey)]">1</span>
              <div>
                <p className="text-sm font-semibold text-white">Create your pool and customize scoring</p>
                <p className="text-xs text-white/50">Standard or custom point values, toggle features on/off</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--slidey)]/20 text-xs font-bold text-[var(--slidey)]">2</span>
              <div>
                <p className="text-sm font-semibold text-white">Share your invite link with friends</p>
                <p className="text-xs text-white/50">One-tap join from any device</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--slidey)]/20 text-xs font-bold text-[var(--slidey)]">3</span>
              <div>
                <p className="text-sm font-semibold text-white">Manage teams and run the show on draft night</p>
                <p className="text-xs text-white/50">Leaderboard, chat, trivia, and live predictions</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            className="w-full rounded-lg bg-[var(--steelers-black)] border-2 border-white/20 px-8 py-3.5 text-sm font-bold text-white hover:border-white/40 transition flex items-center justify-center gap-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google to Get Started
          </button>

          <p className="text-xs text-white/40">
            Just looking to join someone else&apos;s pool?{" "}
            <Link href="/" className="text-[var(--slidey)] hover:underline">Visit the home page</Link>
          </p>
        </div>
      </div>
    );
  }

  // Already a commissioner
  if (session.user.role === "commissioner" || session.user.role === "admin") {
    return (
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/8 border border-white/[0.12] rounded-xl p-8 text-center space-y-4">
          <div className="inline-block rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">Already a Commissioner</div>
          <h1 className="text-2xl font-bold text-white">You&apos;re already set up!</h1>
          <p className="text-white/50 text-sm">Create a new pool or manage your existing ones.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/pools/create" className="rounded-lg bg-[var(--slidey)] px-6 py-3 text-sm font-bold text-white hover:opacity-80 transition">
              Create a Pool
            </Link>
            <Link href="/pools" className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition">
              My Pools
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but not commissioner — show accept button
  return (
    <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/8 border border-white/[0.12] rounded-xl p-8 text-center space-y-6">
        <div className="inline-block rounded-full bg-[var(--slidey)]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--slidey)]">
          Commissioner Invite
        </div>
        <h1 className="text-2xl font-bold text-white">Ready to run your own pool?</h1>
        <p className="text-sm text-white/50">
          Accept this invite to become a commissioner. You&apos;ll be able to create pools, customize scoring, and invite friends.
        </p>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full rounded-lg bg-[var(--slidey)] px-8 py-3.5 text-sm font-bold text-white hover:opacity-80 transition disabled:opacity-50"
        >
          {claiming ? "Activating..." : "Accept Commissioner Invite"}
        </button>
      </div>
    </div>
  );
}
