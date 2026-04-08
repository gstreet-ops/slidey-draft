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
};

type Props = {
  prospect: Prospect | null;
  onClose: () => void;
};

export function ProspectDetailDrawer({ prospect, onClose }: Props) {
  useEffect(() => {
    if (!prospect) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [prospect, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (prospect) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [prospect]);

  if (!prospect) return null;

  const tags = extractTraitTags(prospect.notes ?? null);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-[var(--gtown-navy)] border-l border-white/10 shadow-2xl md:max-w-[400px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition"
        >
          ✕
        </button>

        <div className="p-6 pt-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <PlayerAvatar player={prospect} size={120} />

            {prospect.rank && (
              <span className="mt-4 inline-flex items-center rounded-full bg-[var(--lions-blue)]/20 px-3 py-1 text-sm font-bold text-[var(--lions-blue)]">
                #{prospect.rank} Big Board
              </span>
            )}

            <h2
              className="mt-3 text-2xl font-bold text-white tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {prospect.name.toUpperCase()}
            </h2>

            <span className="mt-1 inline-block rounded-full bg-[var(--lions-blue)]/20 px-3 py-1 text-sm font-semibold text-[var(--lions-blue)]">
              {prospect.position}
            </span>

            <p className="mt-1 text-sm text-white/50">{prospect.school}</p>
          </div>

          {/* Measurables */}
          {(prospect.height || prospect.weight) && (
            <div className="mt-6 flex justify-center gap-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              {prospect.height && (
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Height</p>
                  <p className="text-sm font-semibold text-white">{prospect.height}</p>
                </div>
              )}
              {prospect.weight && (
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Weight</p>
                  <p className="text-sm font-semibold text-white">{prospect.weight} lbs</p>
                </div>
              )}
            </div>
          )}

          {/* Trait Tags */}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
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

          {/* Scouting Report */}
          {prospect.notes && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Scouting Report
              </h3>
              <p className="text-sm leading-relaxed text-white/70">
                {prospect.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
