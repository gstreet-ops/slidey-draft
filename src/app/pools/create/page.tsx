"use client";

import { useState } from "react";
import { createPool } from "@/lib/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreatePoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const pool = await createPool(formData);
      router.push(`/pools/${pool.id}`);
    } catch {
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-white/60 mb-2">Pool Name</label>
            <input
              name="name"
              required
              maxLength={50}
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
