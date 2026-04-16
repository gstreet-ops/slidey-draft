"use client";

import { Suspense, useState } from "react";
import { createPool } from "@/lib/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CreatePoolPage() {
  return (
    <Suspense>
      <CreatePoolContent />
    </Suspense>
  );
}

function CreatePoolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestedName = searchParams.get("name") || "";

  // Gate: only commissioners and admins can create pools
  if (session && session.user.role !== "commissioner" && session.user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[var(--gtown-navy)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Commissioner Access Required</h1>
          <p className="text-white/50 text-sm">
            Only commissioners can create pools. Ask the site admin for a commissioner invite.
          </p>
          <Link href="/pools" className="text-[var(--slidey)] hover:underline text-sm">
            Back to Pools
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData(e.currentTarget);
      const pool = await createPool(formData);
      router.push(`/pools/${pool.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create pool");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--gtown-navy)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">Create a Pool</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-white/60 mb-2">Pool Name</label>
            <input
              name="name"
              required
              maxLength={50}
              defaultValue={suggestedName}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--gtown-highlight)]"
              placeholder="e.g., Office Draft Pool 2026"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Description (optional)</label>
            <textarea
              name="description"
              maxLength={200}
              rows={3}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--gtown-highlight)] resize-none"
              placeholder="What's this pool about?"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--gtown-highlight)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--gtown-highlight)]/80 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Pool"}
          </button>
        </form>
      </main>
    </div>
  );
}
