"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MockDraftsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mock-drafts] ", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">
        Something went wrong loading your drafts.
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        This is usually temporary. Try again, or head home and come back.
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-bold text-[var(--accent-text)] hover:bg-[var(--accent-secondary)] transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-gray-50 transition"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
