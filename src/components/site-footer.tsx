import Link from "next/link";
import { TeamStripe } from "./hero-banner";

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <TeamStripe />
      <div className="border-t border-[var(--border-light)] px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} Draft Day Challenge
          </p>
          <Link href="/guide" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition">
            How to Play
          </Link>
        </div>
      </div>
    </footer>
  );
}
