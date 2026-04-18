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
      <div className="min-h-screen bg-[var(--steelers-black)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Commissioner Access Required</h1>
          <p className="text-[var(--text-muted)] text-sm">
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
    <div className="min-h-screen bg-[var(--steelers-black)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-[var(--text-primary)] tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Create a Pool</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Pool Name</label>
            <input
              name="name"
              required
              maxLength={50}
              defaultValue={suggestedName}
              className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--steelers-gold)]"
              placeholder="e.g., Office Draft Pool 2026"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Description (optional)</label>
            <textarea
              name="description"
              maxLength={200}
              rows={3}
              className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--steelers-gold)] resize-none"
              placeholder="What's this pool about?"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--steelers-gold)] px-6 py-3 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Pool"}
          </button>
        </form>
      </main>
    </div>
  );
}
