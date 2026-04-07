import Link from "next/link";

export function DraftLockedBanner() {
  return (
    <div className="bg-[var(--lions-blue)]/20 border-b border-[var(--lions-blue)]/30 px-6 py-3 text-center">
      <p className="text-sm font-medium text-[var(--lions-blue)]">
        Mock drafts are locked — the draft is live!{" "}
        <Link href="/live" className="underline hover:text-white transition">
          Watch in the War Room →
        </Link>
      </p>
    </div>
  );
}
