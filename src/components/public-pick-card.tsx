"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayerAvatar } from "./player-avatar";

import { extractTraitTags } from "@/lib/trait-tags";
import { checkNeedMatch } from "@/lib/team-needs";

const SPEED_POS = ["WR", "RB", "CB", "S", "FS", "SS"];
const EDGE_POS = ["EDGE", "LB", "OLB", "ILB"];

function fortyTimeColor(position: string, time: number): string {
  const pos = position.toUpperCase();
  if (SPEED_POS.includes(pos) && time <= 4.40) return "text-green-400/70";
  if (SPEED_POS.includes(pos) && time <= 4.50) return "text-blue-400/70";
  if (EDGE_POS.includes(pos) && time <= 4.60) return "text-green-400/70";
  return "text-white/40";
}

type Pick = {
  id: string;
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  playerImageUrl: string | null;
  playerNotes: string | null;
  playerRank: number | null;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl: string | null;
  autoFilled: boolean | null;
  analysis: string | null;
  teamNeeds?: string[] | null;
  playerFortyTime?: number | null;
};

type ScoreInfo = {
  matchType: string;
  actualPlayerName?: string;
  actualPlayerPosition?: string;
  actualPlayerSchool?: string;
};

const MATCH_BG: Record<string, string> = {
  exact: "border-green-500/30 bg-green-500/10",
  close: "border-yellow-500/30 bg-yellow-500/10",
  far: "border-orange-500/30 bg-orange-500/10",
  miss: "border-red-500/30 bg-red-500/10",
};

const MATCH_BADGE: Record<string, { text: string; color: string }> = {
  exact: { text: "+10", color: "text-green-400" },
  close: { text: "+5", color: "text-yellow-400" },
  far: { text: "+3", color: "text-orange-400" },
  miss: { text: "0", color: "text-red-400" },
};

export function PublicPickCard({
  pick,
  score,
  onPlayerClick,
}: {
  pick: Pick;
  score?: ScoreInfo;
  onPlayerClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bgClass = score?.matchType ? MATCH_BG[score.matchType] : "border-white/10 bg-white/5";
  const badge = score?.matchType ? MATCH_BADGE[score.matchType] : null;
  const tags = extractTraitTags(pick.playerNotes, pick.playerPosition);
  const hasExpandContent = pick.playerNotes || pick.analysis;

  return (
    <div className={`rounded-lg border overflow-hidden ${bgClass}`}>
      {/* Main card row */}
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
        {/* Pick number + team logo */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white sm:h-12 sm:w-12 sm:text-lg"
            style={{ backgroundColor: pick.teamPrimaryColor || "#333" }}
          >
            {pick.pickNumber}
          </div>
          {pick.teamLogoUrl && (
            <Image
              src={pick.teamLogoUrl}
              alt={pick.teamAbbreviation}
              width={28}
              height={28}
              className="hidden shrink-0 sm:block"
            />
          )}
        </div>

        {/* Player headshot */}
        <button onClick={onPlayerClick} className="shrink-0">
          <PlayerAvatar
            player={{
              name: pick.playerName,
              imageUrl: pick.playerImageUrl,
              position: pick.playerPosition,
            }}
            size={36}
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={onPlayerClick}
              className={`text-sm font-bold text-white hover:text-[var(--lions-blue)] transition sm:text-lg ${pick.autoFilled ? "italic" : ""}`}
            >
              {pick.playerName}
              {pick.autoFilled && <span className="ml-1.5 text-[10px] text-yellow-400/70 font-medium not-italic sm:text-xs">BPA</span>}
            </button>
            <span className="rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--lions-blue)] sm:text-xs">
              {pick.playerPosition}
            </span>
            {pick.playerFortyTime && (
              <span className={`font-mono text-[10px] font-semibold sm:text-xs ${fortyTimeColor(pick.playerPosition, pick.playerFortyTime)}`}>
                {pick.playerFortyTime.toFixed(2)}s
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/50 sm:text-sm sm:gap-2">
            <span>{pick.playerSchool}</span>
            <span className="text-white/20">&rarr;</span>
            <span>{pick.teamName}</span>
            <span className="text-[10px] text-white/30 sm:text-xs">({pick.teamAbbreviation})</span>
            {(() => {
              const nm = checkNeedMatch(pick.playerPosition, pick.teamNeeds);
              if (nm === "top") return <span className="text-[9px] font-semibold text-green-400">● Need</span>;
              if (nm === "off") return <span className="text-[9px] font-semibold text-amber-400/60">○ Off-need</span>;
              return null;
            })()}
          </div>
          {/* Trait tags on mobile */}
          {tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
              {tags.map((t) => (
                <span key={t.label} className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${t.color}`}>{t.label}</span>
              ))}
            </div>
          )}
          {pick.analysis && (
            <p className="mt-1 text-xs italic text-white/50 truncate">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="inline-block mr-1 -mt-0.5 text-white/30">
                <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2l3 2v-2h5a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm0 1.5h10a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H6.5L4.5 14v-1.5H2a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
              </svg>
              {pick.analysis.length > 120 ? pick.analysis.slice(0, 120) + "..." : pick.analysis}
            </p>
          )}
          {score && score.matchType !== "exact" && score.actualPlayerName && (
            <p className="mt-0.5 text-[10px] text-white/40 sm:text-xs">
              Actual: <span className="text-white/60">{score.actualPlayerName}</span> ({score.actualPlayerPosition}, {score.actualPlayerSchool})
            </p>
          )}
        </div>

        {/* Right side: tags (desktop) + badge + chevron */}
        <div className="flex shrink-0 items-center gap-2 pr-1">
          {/* Desktop trait tags — show max 2 to prevent overflow */}
          {tags.length > 0 && (
            <div className="hidden gap-1.5 sm:flex items-center">
              {tags.slice(0, 2).map((t) => (
                <span key={t.label} className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${t.color}`}>{t.label}</span>
              ))}
              {tags.length > 2 && (
                <span className="text-xs text-white/40">+{tags.length - 2}</span>
              )}
            </div>
          )}
          {badge && <span className={`text-base font-bold sm:text-lg ${badge.color}`}>{badge.text}</span>}
          {hasExpandContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white transition"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && hasExpandContent && (
        <div className="border-t border-white/10 px-4 py-3 space-y-3 sm:px-5 sm:py-4">
          {pick.analysis && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Pick Analysis</h4>
              <p className="text-sm text-white/60 leading-relaxed">{pick.analysis}</p>
            </div>
          )}
          {pick.playerNotes && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Scouting Report</h4>
              <p className="text-sm text-white/60 leading-relaxed">{pick.playerNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
