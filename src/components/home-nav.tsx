"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = { href: string; label: string };

export function HomeNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <span
          className="text-xl font-bold text-white tracking-wider sm:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          DRAFT DAY <span className="text-[var(--slidey)]">CHALLENGE</span>
        </span>

        {/* Desktop nav */}
        <nav className="hidden gap-4 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href + l.label} href={l.href} className="text-white/60 hover:text-white transition">
              {l.label}
            </Link>
          ))}
        </nav>

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

      {open && (
        <nav className="border-t border-white/10 bg-black/30 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
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
