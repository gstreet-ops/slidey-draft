"use client";

import { useEffect } from "react";
import { PlayerAvatar } from "./player-avatar";
import { extractTraitTags } from "@/lib/trait-tags";

type Prospect = {
  name: string;
  position: string;
  school: string;
  rank?: number | null;
  height?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
  notes?: string | null;
  grade?: number | null;
  positionRank?: number | null;
  fortyTime?: number | null;
  vertical?: number | null;
  benchPress?: number | null;
  broadJump?: number | null;
  threeConeDrill?: number | null;
  shuttle?: number | null;
  nflComparison?: string | null;
  schoolLogoUrl?: string | null;
};

type Props = {
  prospect: Prospect | null;
  onClose: () => void;
};

function gradeColor(grade: number): string {
  if (grade >= 90) return "text-green-400 bg-green-500/20 border-green-500/30";
  if (grade >= 80) return "text-blue-400 bg-blue-500/20 border-blue-500/30";
  if (grade >= 70) return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
  return "text-white/50 bg-white/5 border-white/10";
}

export function ProspectDetailDrawer({ prospect, onClose }: Props) {
  useEffect(() => {
    if (!prospect) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [prospect, onClose]);

  useEffect(() => {
    if (prospect) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [prospect]);

  if (!prospect) return null;

  const tags = extractTraitTags(prospect.notes ?? null);

  const measurables: { label: string; value: string }[] = [];
  if (prospect.fortyTime) measurables.push({ label: "40-YD", value: `${prospect.fortyTime}s` });
  if (prospect.vertical) measurables.push({ label: "VERTICAL", value: `${prospect.vertical}"` });
  if (prospect.benchPress) measurables.push({ label: "BENCH", value: `${prospect.benchPress} reps` });
  if (prospect.broadJump) measurables.push({ label: "BROAD", value: `${prospect.broadJump}"` });
  if (prospect.threeConeDrill) measurables.push({ label: "3-CONE", value: `${prospect.threeConeDrill}s` });
  if (prospect.shuttle) measurables.push({ label: "SHUTTLE", value: `${prospect.shuttle}s` });
  if (prospect.height) measurables.push({ label: "HEIGHT", value: prospect.height });
  if (prospect.weight) measurables.push({ label: "WEIGHT", value: `${prospect.weight} lbs` });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[#0c1322] shadow-2xl md:max-w-[420px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>

        {/* Header row */}
        <div className="flex items-start gap-4 border-b border-white/10 bg-white/5 p-5 pt-6">
          <PlayerAvatar player={prospect} size={80} />
          <div className="flex-1 min-w-0 pt-1">
            <h2
              className="text-xl font-bold text-white tracking-wide leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {prospect.name.toUpperCase()}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block rounded-full bg-[var(--lions-blue)] px-2.5 py-0.5 text-xs font-bold text-white">
                {prospect.position}
              </span>
              {prospect.schoolLogoUrl && (
                <img src={prospect.schoolLogoUrl} alt="" className="h-5 w-5 object-contain" />
              )}
              <span className="text-sm text-white/50">{prospect.school}</span>
            </div>
            {prospect.nflComparison && (
              <p className="mt-1.5 text-xs text-white/40">
                NFL Comp: <span className="font-semibold text-white/70">{prospect.nflComparison}</span>
              </p>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {(prospect.positionRank || prospect.rank || prospect.grade) && (
          <div className="flex border-b border-white/10">
            {prospect.positionRank && (
              <div className="flex-1 border-r border-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{prospect.positionRank}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">POS RK</p>
              </div>
            )}
            {prospect.rank && (
              <div className="flex-1 border-r border-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{prospect.rank}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">OVR RK</p>
              </div>
            )}
            {prospect.grade && (
              <div className="flex-1 px-4 py-3 text-center">
                <p className={`inline-flex items-center justify-center rounded-lg border px-3 py-0.5 text-2xl font-bold ${gradeColor(prospect.grade)}`}>
                  {prospect.grade}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mt-0.5">GRADE</p>
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Combine Measurables grid */}
          {measurables.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Combine Measurables
              </h3>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
                {measurables.map((m, i) => (
                  <div
                    key={m.label}
                    className={`px-3 py-2.5 text-center ${i % 2 === 0 ? "bg-[#0c1322]" : "bg-white/5"}`}
                  >
                    <p className="text-sm font-bold text-white">{m.value}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scouting Report */}
          {prospect.notes && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Scouting Report
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                {prospect.notes}
              </p>
            </div>
          )}

          {/* Trait Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tag.color}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
