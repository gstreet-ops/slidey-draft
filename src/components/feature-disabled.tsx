import Link from "next/link";

export function FeatureDisabled({ featureLabel }: { featureLabel: string }) {
  return (
    <div className="min-h-screen bg-[var(--steelers-black)] flex flex-col">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[var(--steelers-gold)]/[0.04] to-transparent" />
      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-xl border border-white/[0.12] bg-white/8 p-8 text-center space-y-4">
          <p className="text-3xl">{"\uD83D\uDD12"}</p>
          <h1
            className="text-xl font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {featureLabel.toUpperCase()} IS OFF
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            {featureLabel} is not enabled for your pool. Ask your commissioner to turn it on in pool settings.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-[var(--steelers-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
