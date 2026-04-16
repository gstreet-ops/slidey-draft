"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { claimInviteCode } from "@/lib/actions";
import Link from "next/link";

export default function InviteActivationPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleActivate() {
    setStatus("loading");
    try {
      const result = await claimInviteCode(code);
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setTimeout(() => router.push("/"), 2000);
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/8 border border-white/[0.12] rounded-xl p-8 text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">Activate Your Account</h1>
        <p className="text-white/60">
          Invite code: <span className="font-mono text-white">{code}</span>
        </p>

        {status === "idle" && (
          <button
            onClick={handleActivate}
            className="w-full rounded-lg bg-[var(--gtown-highlight)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition"
          >
            Activate Full Access
          </button>
        )}

        {status === "loading" && (
          <p className="text-white/60 animate-pulse">Activating...</p>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <p className="text-green-400 font-semibold">{message}</p>
            <p className="text-white/50 text-sm">Redirecting...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <p className="text-red-400">{message}</p>
            <Link
              href="/"
              className="inline-block text-sm text-white/60 hover:text-white transition"
            >
              Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
