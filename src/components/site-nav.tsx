"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  isLoggedIn: boolean;
  isAdmin?: boolean;
  isLocked?: boolean;
  userInitial?: string;
  teamLogoUrl?: string | null;
  teamName?: string | null;
};

export function SiteNav({ isLoggedIn, isAdmin, isLocked, userInitial, teamLogoUrl, teamName }: Props) {
  const [open, setOpen] = useState(false);

  const primaryLinks = [
    ...(isLoggedIn
      ? [
          { href: "/live", label: "Live" },
          { href: "/my-board", label: "My Draft" },
          { href: "/props", label: "Props" },
        ]
      : []),
  ];

  const secondaryLinks = [
    { href: "/picks", label: "Mock Drafts" },
    { href: "/big-board", label: "Prospects" },
    { href: "/scoring", label: "Scoring" },
    { href: "/guide", label: "How to Play" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    ...(!isLoggedIn ? [{ href: "/login", label: "Sign In" }] : []),
  ];

  return (
    <header className="border-b border-white/10 bg-[var(--gtown-navy)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold text-white tracking-wider sm:text-xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
        </Link>

        {/* Desktop nav — primary links only */}
        <nav className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition"
            >
              {l.label}
            </Link>
          ))}
          {/* More dropdown for secondary */}
          <div className="relative group">
            <button className="rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/10 hover:text-white transition">
              More
            </button>
            <div className="absolute right-0 top-full z-50 hidden min-w-[160px] rounded-lg border border-white/10 bg-[var(--gtown-navy)] p-1 shadow-xl group-hover:block">
              {secondaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-md px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {/* User avatar / team logo */}
          {isLoggedIn && (
            <Link href="/pools" className="hidden sm:block">
              {teamLogoUrl ? (
                <Image src={teamLogoUrl} alt={teamName || ""} width={28} height={28} className="object-contain" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--lions-blue)] text-xs font-bold text-white">
                  {userInitial || "?"}
                </div>
              )}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition md:hidden"
            aria-label="Toggle menu"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-white/10 bg-black/30 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-0.5">
            {[...primaryLinks, ...secondaryLinks].map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white transition min-h-[44px] flex items-center"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
