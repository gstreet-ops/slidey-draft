import Link from "next/link";

export function SiteFooter({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <footer className="mt-auto border-t border-white/10 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/30">
          <Link href="/picks" className="hover:text-white/60 transition">Mock Drafts</Link>
          <Link href="/leaderboard" className="hover:text-white/60 transition">Leaderboard</Link>
          <Link href="/guide" className="hover:text-white/60 transition">How to Play</Link>
          {isAdmin && (
            <Link href="/admin" className="hover:text-white/60 transition">Studio</Link>
          )}
        </div>
        <p className="text-xs text-white/20">
          &copy; {new Date().getFullYear()} Draft Day Challenge
        </p>
      </div>
    </footer>
  );
}
