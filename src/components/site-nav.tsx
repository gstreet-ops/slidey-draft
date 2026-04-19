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
  enabledFeatures?: string[];
};

export function SiteNav({ isLoggedIn, userInitial, teamLogoUrl, teamName, enabledFeatures }: Props) {
  const [open, setOpen] = useState(false);

  const enabled = new Set(enabledFeatures ?? ["mockDraft", "livePredictions", "trivia", "propBets", "watchParty"]);
  const liveLabel = enabled.has("livePredictions")
    ? "Live"
    : enabled.has("trivia") || enabled.has("watchParty")
    ? "Draft Night"
    : null;

  const primaryLinks = isLoggedIn
    ? [
        ...(liveLabel ? [{ href: "/live", label: liveLabel }] : []),
        ...(enabled.has("mockDraft") ? [{ href: "/mock-drafts", label: "Mock Drafts" }] : []),
        { href: "/guide", label: "How to Play" },
      ]
    : [];

  const secondaryLinks = [
    ...(isLoggedIn && enabled.has("propBets") ? [{ href: "/props", label: "Props" }] : []),
    { href: "/big-board", label: "Prospects" },
    { href: "/trades", label: "Trades" },
    { href: "/scoring", label: "Scoring" },
    ...(isLoggedIn ? [{ href: "/settings", label: "⚙ Settings" }] : []),
    ...(!isLoggedIn ? [{ href: "/login", label: "Sign In" }] : []),
  ];

  return (
    <header className="bg-[var(--bg-nav)] relative">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold text-white tracking-wider sm:text-xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          DRAFT DAY <span className="text-[var(--accent-primary)]">CHALLENGE</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              {l.label}
            </Link>
          ))}
          <div className="relative group">
            <button className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition">
              More
            </button>
            <div className="absolute right-0 top-full z-50 hidden min-w-[160px] rounded-lg border border-white/10 bg-[var(--bg-nav)] p-1 shadow-xl group-hover:block">
              {secondaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <Link href="/settings" className="hidden sm:block" aria-label="Settings">
              {teamLogoUrl ? (
                <Image src={teamLogoUrl} alt={teamName || ""} width={28} height={28} className="object-contain" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-[var(--accent-text)]">
                  {userInitial || "?"}
                </div>
              )}
            </Link>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition md:hidden"
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

      {/* Accent gradient line under nav */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary) 40%, transparent), transparent)",
        }}
        aria-hidden
      />

      {open && (
        <nav className="border-t border-white/10 bg-black/30 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-0.5">
            {[...primaryLinks, ...secondaryLinks].map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition min-h-[44px] flex items-center"
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
