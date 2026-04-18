"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
};

type Props = {
  links: NavLink[];
  logo?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function MobileNav({ links, logo, trailing }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        {logo}

        {/* Desktop nav */}
        <nav className="hidden gap-4 text-sm md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Trailing (avatar etc) — always visible */}
          {trailing}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition md:hidden"
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

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-[var(--border)] bg-black/30 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] transition"
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
