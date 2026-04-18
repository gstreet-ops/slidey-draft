"use client";

export default function PoolError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Something went wrong</h2>
        <p className="text-[var(--text-muted)] text-sm">
          An error occurred loading the pool dashboard. This might be temporary.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-[var(--slidey)] px-6 py-2 text-sm font-semibold text-[var(--text-primary)] hover:opacity-80 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
