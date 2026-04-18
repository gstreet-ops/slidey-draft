"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayerAvatar } from "@/components/player-avatar";
import { ProspectDetailDrawer } from "@/components/prospect-detail-drawer";
import { extractTraitTags } from "@/lib/trait-tags";

type Prospect = {
  id: string;
  name: string;
  position: string;
  school: string;
  rank: number | null;
  imageUrl: string | null;
  schoolLogoUrl: string | null;
  height: string | null;
  weight: number | null;
  notes: string | null;
  grade: number | null;
  positionRank: number | null;
  nflComparison: string | null;
  fortyTime: number | null;
  vertical: number | null;
  benchPress: number | null;
  broadJump: number | null;
  threeConeDrill: number | null;
  shuttle: number | null;
  consensusLow: number | null;
  consensusHigh: number | null;
  consensusMid: number | null;
};

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "OT", "OG", "C", "EDGE", "DT", "LB", "CB", "S"];

function gradeColor(grade: number): string {
  if (grade >= 90) return "bg-green-100 text-green-700 border-green-200";
  if (grade >= 80) return "bg-blue-100 text-blue-700 border-blue-200";
  if (grade >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]";
}

export function BigBoardClient({ prospects, isLoggedIn }: { prospects: Prospect[]; isLoggedIn: boolean }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [drawerProspect, setDrawerProspect] = useState<Prospect | null>(null);

  const filtered = prospects.filter((p) => {
    if (posFilter !== "ALL" && p.position !== posFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <div className="space-y-4">
        {/* Search + filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search by name or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--steelers-gold)] focus:outline-none"
          />
          <div className="flex gap-1 flex-wrap overflow-x-auto scrollbar-none">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  posFilter === pos
                    ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)]">{filtered.length} prospects</p>

        {/* Prospect list */}
        <div className="space-y-2">
          {filtered.map((p) => {
            const tags = extractTraitTags(p.notes, p.position, 2);
            return (
              <button
                key={p.id}
                onClick={() => setDrawerProspect(p)}
                className="flex w-full items-center gap-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 text-left transition hover:bg-gray-50 sm:gap-4 sm:px-5 sm:py-4"
              >
                {/* Rank */}
                <span className="w-8 text-center text-sm font-bold text-[var(--text-muted)] shrink-0 sm:w-10 sm:text-base">
                  {p.rank}
                </span>

                {/* Headshot */}
                <PlayerAvatar player={p} size={44} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate sm:text-base">{p.name}</span>
                    <span className="shrink-0 rounded-full bg-[var(--steelers-gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)] sm:text-xs">
                      {p.position}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {p.schoolLogoUrl && (
                      <Image src={p.schoolLogoUrl} alt="" width={14} height={14} className="shrink-0 object-contain" />
                    )}
                    <span className="text-xs text-[var(--text-muted)] truncate">{p.school}</span>
                    {p.nflComparison && (
                      <span className="hidden text-xs text-[var(--text-muted)] sm:inline">· Comp: {p.nflComparison}</span>
                    )}
                    {p.consensusLow != null && p.consensusHigh != null && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono sm:text-xs">
                        · Range {p.consensusLow}-{p.consensusHigh}
                      </span>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex gap-1 mt-1 sm:hidden">
                      {tags.map((t) => (
                        <span key={t.label} className={`rounded-full px-1.5 py-0 text-[9px] font-semibold ${t.color}`}>{t.label}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side — grade + tags (desktop) */}
                <div className="flex shrink-0 items-center gap-2">
                  {tags.length > 0 && (
                    <div className="hidden gap-1 sm:flex">
                      {tags.map((t) => (
                        <span key={t.label} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.color}`}>{t.label}</span>
                      ))}
                    </div>
                  )}
                  {p.grade && (
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${gradeColor(p.grade)}`}>
                      {p.grade}
                    </span>
                  )}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)] text-[10px] font-bold shrink-0 sm:h-8 sm:w-8 sm:text-xs">
                    i
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ProspectDetailDrawer
        prospect={drawerProspect}
        onClose={() => setDrawerProspect(null)}
      />
    </>
  );
}
