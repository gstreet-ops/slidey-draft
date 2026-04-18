"use client";

import { useState } from "react";
import Image from "next/image";
import { TeamImage } from "@/components/team-image";
import type { LetterGrade } from "@/lib/mock-grading";

export type ComparePick = {
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  playerRank: number | null;
  playerGrade: number | null;
  teamAbbreviation: string;
  teamName: string;
  teamLogoUrl: string | null;
  teamPrimaryColor: string | null;
};

export type MemberDraft = {
  userId: string;
  userName: string;
  userImage: string | null;
  /** Member's favorite NFL team (the team they ROOT for, not picks) */
  teamAbbreviation: string | null;
  teamName: string | null;
  teamPrimaryColor: string | null;
  boardId: string | null;
  boardTitle: string | null;
  boardStatus: string | null;
  pickCount: number;
  picks: ComparePick[];
  isMe: boolean;
  overlapCount: number;
  exactSlotMatches: number;
  grade: {
    letterGrade: LetterGrade;
    summary: string;
    steals: number;
    solid: number;
    reaches: number;
    busts: number;
  } | null;
  positionBreakdown: Array<{ position: string; count: number }>;
  mostPopular: { pickNumber: number; playerName: string; otherCount: number } | null;
  mostUnique: { pickNumber: number; playerName: string } | null;
};

type Props = {
  drafts: MemberDraft[];
  /** Current user's pick keyed by pick number — used for side-by-side compare on each row */
  myPickByNumber: Record<number, ComparePick>;
  totalSlots: number;
};

function gradeBadgeColors(grade: LetterGrade): string {
  switch (grade) {
    case "A+":
    case "A":
      return "bg-green-100 text-green-700 border-green-200";
    case "B+":
    case "B":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "C+":
    case "C":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "D":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "F":
      return "bg-red-100 text-red-700 border-red-200";
  }
}

export function PoolDraftsList({ drafts, myPickByNumber, totalSlots }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {drafts.map((d) => {
        const isExpanded = expandedId === d.userId;
        const overlapPct = totalSlots > 0 ? Math.round((d.overlapCount / totalSlots) * 100) : 0;
        const isPublished = d.boardStatus === "published";
        const isEmpty = d.pickCount === 0;

        return (
          <article
            key={d.userId}
            className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
              d.isMe
                ? "border-l-4 border-l-[var(--accent-primary)] border-y-gray-200 border-r-gray-200"
                : "border-gray-200 hover:border-[var(--accent-primary)]/40"
            }`}
          >
            {/* Card header */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : d.userId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5 sm:py-4"
              aria-expanded={isExpanded}
            >
              {/* Member's favorite NFL team logo (falls back to initials chip in team color) */}
              <div className="shrink-0">
                <TeamImage
                  teamCode={d.teamAbbreviation}
                  variant="logo"
                  size={36}
                  fallback="initials"
                  className="h-9 w-9"
                  alt={d.teamName ?? d.userName}
                />
              </div>

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">
                    {d.userName}
                  </h3>
                  {d.isMe && (
                    <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                      You
                    </span>
                  )}
                  {isPublished && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                      Published
                    </span>
                  )}
                  {!isPublished && d.boardStatus === "draft" && d.pickCount > 0 && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-700">
                      Draft
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
                  {d.teamAbbreviation ? `${d.teamAbbreviation} · ` : ""}
                  {d.boardTitle ?? "No mock draft yet"} · {d.pickCount}/{totalSlots} picks
                </p>
              </div>

              {/* Grade badge */}
              {d.grade && (
                <div
                  className={`hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${gradeBadgeColors(d.grade.letterGrade)}`}
                  style={{ fontFamily: "var(--font-display)" }}
                  title={d.grade.summary}
                >
                  {d.grade.letterGrade}
                </div>
              )}

              {/* Comparison stats — hidden for self */}
              {!d.isMe && d.pickCount > 0 && (
                <div className="hidden md:block text-right shrink-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {d.overlapCount}/{totalSlots} <span className="text-[var(--text-muted)] font-normal">match</span>
                  </p>
                  <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                      style={{ width: `${overlapPct}%` }}
                    />
                  </div>
                  {d.exactSlotMatches > 0 && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-700">
                      ★ {d.exactSlotMatches} exact-slot
                    </p>
                  )}
                </div>
              )}

              {/* Chevron */}
              <span
                className={`shrink-0 transition-transform text-[var(--text-muted)] ${isExpanded ? "rotate-180" : ""}`}
                aria-hidden
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6l5 5 5-5" />
                </svg>
              </span>
            </button>

            {/* Mobile-only stats row (hidden on md+) */}
            {(d.grade || (!d.isMe && d.pickCount > 0)) && (
              <div className="md:hidden flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2 text-xs">
                {d.grade && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${gradeBadgeColors(d.grade.letterGrade)}`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Grade {d.grade.letterGrade}
                  </span>
                )}
                {!d.isMe && d.pickCount > 0 && (
                  <>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {d.overlapCount}/{totalSlots} <span className="text-[var(--text-muted)] font-normal">match</span>
                    </span>
                    {d.exactSlotMatches > 0 && (
                      <span className="font-semibold text-amber-700">★ {d.exactSlotMatches} exact</span>
                    )}
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)]"
                        style={{ width: `${overlapPct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Expanded view */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {isEmpty ? (
                  <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    No picks yet.
                  </p>
                ) : (
                  <>
                    <AnalysisBlock draft={d} />
                    <PickGrid
                      picks={d.picks}
                      myPickByNumber={myPickByNumber}
                      totalSlots={totalSlots}
                      isMe={d.isMe}
                    />
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function AnalysisBlock({ draft }: { draft: MemberDraft }) {
  return (
    <div className="px-4 sm:px-5 pt-4">
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 sm:p-4 space-y-2">
        {draft.grade && (
          <p className="text-sm text-[var(--text-secondary)] italic">
            &ldquo;{draft.grade.summary}&rdquo;
          </p>
        )}

        {draft.grade && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
            <span className="text-green-700 font-semibold">{draft.grade.steals} <span className="font-normal text-[var(--text-muted)]">steals</span></span>
            <span className="text-blue-700 font-semibold">{draft.grade.solid} <span className="font-normal text-[var(--text-muted)]">solid</span></span>
            <span className="text-yellow-700 font-semibold">{draft.grade.reaches} <span className="font-normal text-[var(--text-muted)]">reaches</span></span>
            <span className="text-red-700 font-semibold">{draft.grade.busts} <span className="font-normal text-[var(--text-muted)]">busts</span></span>
          </div>
        )}

        {(draft.mostPopular || draft.mostUnique) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-[var(--text-secondary)]">
            {draft.mostPopular && draft.mostPopular.otherCount > 0 && (
              <span>
                <span className="text-[var(--text-muted)]">Most popular:</span>{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {draft.mostPopular.playerName}
                </span>{" "}
                <span className="text-[var(--text-muted)]">
                  at #{draft.mostPopular.pickNumber} (+{draft.mostPopular.otherCount} others)
                </span>
              </span>
            )}
            {draft.mostUnique && (
              <span>
                <span className="text-[var(--text-muted)]">Boldest:</span>{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {draft.mostUnique.playerName}
                </span>{" "}
                <span className="text-[var(--text-muted)]">
                  at #{draft.mostUnique.pickNumber} (no one else)
                </span>
              </span>
            )}
          </div>
        )}

        {draft.positionBreakdown.length > 0 && (
          <div className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate">
            {draft.positionBreakdown.map((pb, i) => (
              <span key={pb.position}>
                {i > 0 && <span className="mx-1.5">|</span>}
                <span className="font-semibold text-[var(--text-secondary)]">{pb.position}</span>: {pb.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PickGrid({
  picks,
  myPickByNumber,
  totalSlots,
  isMe,
}: {
  picks: ComparePick[];
  myPickByNumber: Record<number, ComparePick>;
  totalSlots: number;
  isMe: boolean;
}) {
  const myPlayerIds = new Set(Object.values(myPickByNumber).map((p) => p.playerId));
  const pickByNumber = new Map(picks.map((p) => [p.pickNumber, p]));

  const rows = Array.from({ length: totalSlots }, (_, i) => i + 1);

  return (
    <div className="divide-y divide-gray-100 mt-2">
      {rows.map((n) => {
        const pick = pickByNumber.get(n);
        const mine = myPickByNumber[n];
        const sameAnywhere = pick ? myPlayerIds.has(pick.playerId) : false;
        const exactMatch = pick && mine && mine.playerId === pick.playerId;

        return (
          <div
            key={n}
            className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-2 text-sm ${
              n % 2 === 0 ? "bg-gray-50/40" : ""
            } ${exactMatch ? "bg-amber-50/60" : sameAnywhere ? "bg-green-50/60" : ""}`}
          >
            <span className="text-xs font-mono font-bold text-[var(--text-muted)]">#{n}</span>

            {pick ? (
              <div className="flex items-center gap-2 min-w-0">
                {pick.teamLogoUrl ? (
                  <Image
                    src={pick.teamLogoUrl}
                    alt={pick.teamAbbreviation}
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain shrink-0"
                  />
                ) : (
                  <span
                    className="inline-block h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: pick.teamPrimaryColor ?? "#666" }}
                  >
                    {pick.teamAbbreviation}
                  </span>
                )}
                <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] w-9 shrink-0">
                  {pick.teamAbbreviation}
                </span>
                <span className="font-semibold text-[var(--text-primary)] truncate">{pick.playerName}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0">
                  {pick.playerPosition}
                </span>
                <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">{pick.playerSchool}</span>
              </div>
            ) : (
              <span className="italic text-[var(--text-muted)]">Empty — no pick yet</span>
            )}

            <div className="flex items-center gap-2 text-xs shrink-0">
              {!isMe && exactMatch && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  ★ Exact
                </span>
              )}
              {!isMe && !exactMatch && sameAnywhere && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                  ✓ Match
                </span>
              )}
              {!isMe && !exactMatch && mine && (
                <span className="hidden md:inline text-[11px] text-[var(--text-muted)] truncate max-w-[160px]" title={`You: ${mine.playerName}`}>
                  You: <span className="text-[var(--text-secondary)]">{mine.playerName}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
