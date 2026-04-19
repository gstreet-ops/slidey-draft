import Link from "next/link";

export function DraftLockedBanner() {
  return (
    <div className="bg-[var(--steelers-gold)]/20 border-b border-[var(--steelers-gold)]/30 px-6 py-3 text-center">
      <p className="text-sm font-medium text-[var(--steelers-gold)]">
        Mock drafts are locked — the draft is live!{" "}
        <Link href="/live" className="underline hover:text-[var(--text-primary)] transition">
          Go to Live →
        </Link>
      </p>
    </div>
  );
}
