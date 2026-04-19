"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { makePick, removePick, publishBoard, autoFillByRank, updatePickAnalysis } from "@/lib/actions";
import { PlayerAvatar } from "@/components/player-avatar";
import { PickGradeBadge } from "@/components/pick-grade-badge";
import { gradePick } from "@/lib/mock-grading";
import { generatePickCommentary, gradeColorHex, valueExplanation, consensusExplanation } from "@/lib/pick-commentary";
import { checkNeedMatch, matchesAnyNeed, generateNeedsAnalysis } from "@/lib/team-needs";
import { TradeIndicator } from "@/components/trade-indicator";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl: string | null;
  teamNeeds: string[] | null;
  note: string | null;
};

type ExistingPick = {
  id: string;
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  playerImageUrl: string | null;
  playerNotes: string | null;
  playerHeight: string | null;
  playerWeight: number | null;
  playerRank: number | null;
  playerGrade: number | null;
  playerPositionRank: number | null;
  playerFortyTime: number | null;
  playerVertical: number | null;
  playerBenchPress: number | null;
  playerBroadJump: number | null;
  playerThreeConeDrill: number | null;
  playerShuttle: number | null;
  playerNflComparison: string | null;
  playerSchoolLogoUrl: string | null;
  consensusLow: number | null;
  consensusHigh: number | null;
  consensusMid: number | null;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl: string | null;
  analysis: string | null;
};

type Player = {
  id: string;
  name: string;
  position: string;
  school: string;
  rank: number | null;
  imageUrl: string | null;
  notes: string | null;
  height: string | null;
  weight: number | null;
  grade: number | null;
  positionRank: number | null;
  fortyTime: number | null;
  vertical: number | null;
  benchPress: number | null;
  broadJump: number | null;
  threeConeDrill: number | null;
  shuttle: number | null;
  nflComparison: string | null;
  schoolLogoUrl: string | null;
  consensusLow: number | null;
  consensusHigh: number | null;
  consensusMid: number | null;
};

/** Minimal trade info — most recent trade per pick, for the ↔ indicator. */
export type SlotTradeInfo = {
  tradeId: string;
  previousTeamAbbreviation: string;
  newTeamAbbreviation: string;
};

type Props = {
  boardId: string;
  boardStatus: string;
  draftOrder: DraftSlot[];
  existingPicks: ExistingPick[];
  availablePlayers: Player[];
  readOnly?: boolean;
  /** User's favorite NFL team abbreviation (e.g. "PIT") — slots for this team get a YOUR TEAM accent. */
  favoriteTeamAbbr?: string | null;
  /** Trade indicators keyed by pick number. */
  tradesByPick?: Record<number, SlotTradeInfo>;
};

/* ── 40-time color helper ────────────────────────────────────── */

const SPEED_POS = ["WR", "RB", "CB", "S", "FS", "SS"];
const EDGE_LB_POS = ["EDGE", "LB", "OLB", "ILB"];

function fortyTimeColor(position: string, time: number): string {
  const pos = position.toUpperCase();
  if (SPEED_POS.includes(pos) && time <= 4.40) return "text-green-700/70";
  if (SPEED_POS.includes(pos) && time <= 4.50) return "text-blue-700/70";
  if (EDGE_LB_POS.includes(pos) && time <= 4.60) return "text-green-700/70";
  return "text-[var(--text-muted)]";
}

/* ── Inline detail panel (ESPN-style) ────────────────────────── */

function gradeColor(grade: number): string {
  if (grade >= 90) return "text-green-700 bg-green-100 border-green-200";
  if (grade >= 80) return "text-blue-700 bg-blue-100 border-blue-200";
  if (grade >= 70) return "text-yellow-700 bg-yellow-100 border-yellow-200";
  return "text-[var(--text-muted)] bg-[var(--bg-card)] border-[var(--border)]";
}

function InlineProspectDetail({ player, onClose, pickNumber, teamName, teamNeeds }: { player: Player; onClose: () => void; pickNumber?: number; teamName?: string; teamNeeds?: string[] | null }) {
  const measurables: { label: string; value: string }[] = [];
  if (player.fortyTime) measurables.push({ label: "40-YD", value: `${player.fortyTime}s` });
  if (player.vertical) measurables.push({ label: "VERTICAL", value: `${player.vertical}"` });
  if (player.benchPress) measurables.push({ label: "BENCH", value: `${player.benchPress} reps` });
  if (player.broadJump) measurables.push({ label: "BROAD", value: `${player.broadJump}"` });
  if (player.threeConeDrill) measurables.push({ label: "3-CONE", value: `${player.threeConeDrill}s` });
  if (player.shuttle) measurables.push({ label: "SHUTTLE", value: `${player.shuttle}s` });
  if (player.height) measurables.push({ label: "HEIGHT", value: player.height });
  if (player.weight) measurables.push({ label: "WEIGHT", value: `${player.weight} lbs` });

  return (
    <div className="border-t border-[var(--border)] bg-white px-3 py-3">
      {/* Header: avatar + name + basics */}
      <div className="flex items-start gap-3 mb-3">
        <PlayerAvatar player={player} size={56} />
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-bold text-[var(--text-primary)] tracking-wide sm:text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {player.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-block rounded-full bg-[var(--steelers-gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              {player.position}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {player.height && `${player.height}`}
              {player.height && player.weight && " · "}
              {player.weight && `${player.weight} lbs`}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{player.school}</span>
          </div>
          {player.nflComparison && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              NFL Comp: <span className="font-semibold text-[var(--text-secondary)]">{player.nflComparison}</span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-gray-50 hover:text-[var(--text-secondary)] transition"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      {/* Stats bar: POS RK / OVR RK / GRADE */}
      {(player.positionRank || player.rank || player.grade) && (
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden mb-3">
          {player.positionRank && (
            <div className="flex-1 border-r border-[var(--border)] px-3 py-2 text-center bg-[var(--bg-card)]">
              <p className="text-lg font-bold text-[var(--text-primary)]">{player.positionRank}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">POS RK</p>
            </div>
          )}
          {player.rank && (
            <div className="flex-1 border-r border-[var(--border)] px-3 py-2 text-center bg-[var(--bg-card)]">
              <p className="text-lg font-bold text-[var(--text-primary)]">{player.rank}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">OVR RK</p>
            </div>
          )}
          {player.grade && (
            <div className="flex-1 px-3 py-2 text-center bg-[var(--bg-card)]">
              <p className={`inline-flex items-center justify-center rounded border px-2 py-0.5 text-lg font-bold ${gradeColor(player.grade)}`}>
                {player.grade}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">GRADE</p>
            </div>
          )}
        </div>
      )}

      {/* Measurables mini-grid */}
      {measurables.length > 0 && (
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] mb-3">
          {measurables.map((m, i) => (
            <div key={m.label} className={`px-2 py-1.5 text-center ${i % 2 === 0 ? "bg-white" : "bg-[var(--bg-card)]"}`}>
              <p className="text-xs font-bold text-[var(--text-primary)]">{m.value}</p>
              <p className="text-[8px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mock Grade breakdown */}
      {pickNumber && (
        (() => {
          const pg = gradePick(pickNumber, player.grade, player.rank);
          return (
            <div className="mb-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Mock Grade</h4>
              <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="flex-1 border-r border-[var(--border)] px-3 py-2 text-center bg-[var(--bg-card)]">
                  <PickGradeBadge grade={pg.valueGrade} size="md" />
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">Value</p>
                </div>
                <div className="flex-1 border-r border-[var(--border)] px-3 py-2 text-center bg-[var(--bg-card)]">
                  <PickGradeBadge grade={pg.consensusGrade} size="md" />
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">Consensus</p>
                </div>
                <div className="flex-1 px-3 py-2 text-center bg-[var(--bg-card)]">
                  <PickGradeBadge grade={pg.letterGrade} size="md" />
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">Combined</p>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Draft Analysis (commentary) */}
      {pickNumber && (() => {
        const pg = gradePick(pickNumber, player.grade, player.rank);
        const commentary = generatePickCommentary(
          {
            pickNumber,
            playerName: player.name,
            playerPosition: player.position,
            playerGrade: player.grade,
            playerRank: player.rank,
            playerPositionRank: player.positionRank,
            playerNflComparison: player.nflComparison,
            teamName: "",
            teamAbbreviation: "",
          },
          pg,
          { picksSoFar: [], totalPicks: 0 }
        );
        return (
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Draft Analysis</h4>
            <p className="text-xs italic leading-relaxed text-[var(--text-secondary)]">{commentary}</p>
            <div className="mt-1.5 text-[10px] text-[var(--text-muted)] space-y-0.5">
              <p>Value: {pg.valueGrade} — {valueExplanation(pickNumber, player.grade)}</p>
              <p>Consensus: {pg.consensusGrade} — {consensusExplanation(pickNumber, player.rank)}</p>
            </div>
          </div>
        );
      })()}

      {/* Team Needs Analysis */}
      {teamName && (() => {
        const analysis = generateNeedsAnalysis(teamName, player.name, player.position, teamNeeds);
        if (!analysis) return null;
        return (
          <div className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Team Needs Analysis</h4>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{analysis}</p>
          </div>
        );
      })()}

      {/* Pre-Draft Analysis */}
      {player.notes && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Pre-Draft Analysis</h4>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{player.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ── Helper to build a Player object from an ExistingPick ──── */
function pickToPlayer(pick: ExistingPick): Player {
  return {
    id: pick.playerId,
    name: pick.playerName,
    position: pick.playerPosition,
    school: pick.playerSchool,
    rank: pick.playerRank,
    imageUrl: pick.playerImageUrl,
    notes: pick.playerNotes,
    height: pick.playerHeight,
    weight: pick.playerWeight,
    grade: pick.playerGrade,
    positionRank: pick.playerPositionRank,
    fortyTime: pick.playerFortyTime,
    vertical: pick.playerVertical,
    benchPress: pick.playerBenchPress,
    broadJump: pick.playerBroadJump,
    threeConeDrill: pick.playerThreeConeDrill,
    shuttle: pick.playerShuttle,
    nflComparison: pick.playerNflComparison,
    schoolLogoUrl: pick.playerSchoolLogoUrl,
    consensusLow: pick.consensusLow,
    consensusHigh: pick.consensusHigh,
    consensusMid: pick.consensusMid,
  };
}

/* ── Main Component ──────────────────────────────────────────── */

export function PickBuilder({
  boardId,
  boardStatus,
  draftOrder,
  existingPicks,
  availablePlayers,
  readOnly = false,
  favoriteTeamAbbr,
  tradesByPick,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [localPickedIds, setLocalPickedIds] = useState<Set<string>>(new Set());
  const [analysisText, setAnalysisText] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // Inline expansion state — keyed by player ID
  const [expandedPickId, setExpandedPickId] = useState<string | null>(null);
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);

  // Inline note editing
  const [editingNotePickId, setEditingNotePickId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [needsOnly, setNeedsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "fastest" | "grade">("rank");

  // Mobile-only UI state — bottom bar + slide-up prospects drawer.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [flashedSlot, setFlashedSlot] = useState<number | null>(null);

  const pickMap = new Map(existingPicks.map((p) => [p.pickNumber, p]));

  const allPickedIds = new Set([
    ...existingPicks.map((p) => p.playerId),
    ...localPickedIds,
  ]);

  const realAvailable = availablePlayers.filter((p) => !allPickedIds.has(p.id));

  const positions = ["ALL", ...Array.from(new Set(realAvailable.map((p) => p.position))).sort()];

  const activeSlotData = activeSlot ? draftOrder.find((s) => s.pickNumber === activeSlot) : null;

  const filteredPlayers = realAvailable
    .filter(
      (p) =>
        (posFilter === "ALL" || p.position === posFilter) &&
        (!needsOnly || !activeSlotData?.teamNeeds || matchesAnyNeed(p.position, activeSlotData.teamNeeds)) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
         p.position.toLowerCase().includes(search.toLowerCase()) ||
         p.school.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "fastest") {
        if (!a.fortyTime && !b.fortyTime) return 0;
        if (!a.fortyTime) return 1;
        if (!b.fortyTime) return -1;
        return a.fortyTime - b.fortyTime;
      }
      if (sortBy === "grade") {
        if (!a.grade && !b.grade) return 0;
        if (!a.grade) return 1;
        if (!b.grade) return -1;
        return b.grade - a.grade;
      }
      // Default: rank
      if (!a.rank && !b.rank) return 0;
      if (!a.rank) return 1;
      if (!b.rank) return -1;
      return a.rank - b.rank;
    });

  function flashSaved() {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  function handleMakePick(playerId: string, slot: DraftSlot) {
    setLocalPickedIds((prev) => new Set([...prev, playerId]));
    setPickError(null);
    const analysis = analysisText.trim() || undefined;
    startTransition(async () => {
      try {
        await makePick(boardId, slot.pickNumber, playerId, slot.teamId, analysis);
        setActiveSlot(null);
        setSearch("");
        setAnalysisText("");
        flashSaved();
        // Mobile UX: close the drawer + flash the slot we just filled, then scroll it into view
        setDrawerOpen(false);
        setFlashedSlot(slot.pickNumber);
        setTimeout(() => {
          const el = document.querySelector(`[data-pick-slot="${slot.pickNumber}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 60);
        setTimeout(() => setFlashedSlot((s) => (s === slot.pickNumber ? null : s)), 1500);
      } catch (err) {
        setLocalPickedIds((prev) => {
          const next = new Set(prev);
          next.delete(playerId);
          return next;
        });
        setPickError(err instanceof Error ? err.message : "Failed to make pick");
        setTimeout(() => setPickError(null), 4000);
      }
    });
  }

  /** Smart-pick from mobile prospect view: use activeSlot if set, else first empty slot. */
  function handleSelectProspect(playerId: string) {
    const slot = activeSlotData
      ?? draftOrder.find((s) => !pickMap.has(s.pickNumber));
    if (!slot) {
      setPickError("All 32 picks are filled.");
      setTimeout(() => setPickError(null), 3000);
      return;
    }
    handleMakePick(playerId, slot);
  }

  function handleRemovePick(pickId: string, playerId: string) {
    setLocalPickedIds((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
    startTransition(async () => {
      await removePick(pickId, boardId);
      flashSaved();
    });
  }

  function handlePublish() {
    startTransition(async () => {
      await publishBoard(boardId);
    });
  }

  // Determine current round (1-based) from first empty slot
  const firstEmptyPick = draftOrder.find((s) => !pickMap.has(s.pickNumber));
  const currentRound = firstEmptyPick ? Math.ceil(firstEmptyPick.pickNumber / 32) : 1;
  const emptyInRound = draftOrder.filter(
    (s) =>
      !pickMap.has(s.pickNumber) &&
      s.pickNumber > (currentRound - 1) * 32 &&
      s.pickNumber <= currentRound * 32
  ).length;
  const totalEmpty = draftOrder.filter((s) => !pickMap.has(s.pickNumber)).length;

  function handleAutoFill(mode: "round" | "all") {
    startTransition(async () => {
      await autoFillByRank(boardId, mode, currentRound);
      flashSaved();
    });
  }

  // Toggle inline expansion helpers
  function togglePickExpand(playerId: string) {
    setExpandedPickId((prev) => (prev === playerId ? null : playerId));
  }
  function toggleProspectExpand(playerId: string) {
    setExpandedProspectId((prev) => (prev === playerId ? null : playerId));
  }

  /* ── Prospect pool content (sidebar + mobile sheet) ──────── */
  const prospectPoolContent = (
    <>
      {pickError && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {pickError}
        </div>
      )}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <h2
            className="text-sm font-bold text-[var(--text-primary)] tracking-wide sm:text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PROSPECT POOL
          </h2>
          <span className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Next Best Prospect
          </span>
        </div>
        {activeSlot && (
          <p className="text-xs text-[var(--steelers-gold)] mt-0.5">
            Select for Pick #{activeSlot} &mdash; {draftOrder.find((s) => s.pickNumber === activeSlot)?.teamName}
          </p>
        )}
      </div>
      <input
        type="text"
        placeholder="Search prospects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-lg border border-white/30 bg-[var(--bg-card)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--steelers-gold)] focus:outline-none sm:px-3 sm:py-2 sm:text-sm"
      />
      <div className="mb-2 flex gap-0.5 flex-wrap overflow-x-auto scrollbar-none sm:mb-3 sm:gap-1">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold transition sm:px-2 sm:py-1 sm:text-xs ${
              posFilter === pos
                ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Needs Only toggle */}
      {activeSlot && activeSlotData?.teamNeeds && activeSlotData.teamNeeds.length > 0 && (
        <button
          onClick={() => setNeedsOnly(!needsOnly)}
          className={`mb-2 rounded-full px-3 py-1 text-[10px] font-semibold transition ${
            needsOnly
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {needsOnly ? "✓ Needs Only" : "Needs Only"}
        </button>
      )}

      {/* Sort options */}
      <div className="mb-2 flex gap-1">
        {(["rank", "fastest", "grade"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              sortBy === s
                ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {s === "rank" ? "Rank" : s === "fastest" ? "Fastest" : "Grade"}
          </button>
        ))}
      </div>

      {/* Analysis text area */}
      {activeSlot && !readOnly && (
        <div className="mb-3">
          <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Why this pick?</label>
          <textarea
            placeholder="Share your reasoning — why does this player fit here? (optional)"
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--steelers-gold)] focus:outline-none resize-none"
            rows={2}
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Your notes will be visible to everyone in your pool</p>
        </div>
      )}

      <div className="space-y-1">
        {filteredPlayers.map((player) => {
          const slot = activeSlot
            ? draftOrder.find((s) => s.pickNumber === activeSlot)
            : null;
          const isExpanded = expandedProspectId === player.id;
          // Tap-to-pick is always available off the active-slot path; the smart
          // handler picks first-empty when no slot is explicitly active.
          const canPick = !readOnly;

          return (
            <div key={player.id} className="rounded-md overflow-hidden sm:rounded-lg">
              {/* Row */}
              <div
                className={`flex items-center gap-1.5 bg-[var(--bg-card)] px-1.5 py-1 text-left transition min-h-[30px] sm:gap-2 sm:px-2.5 sm:py-1.5 sm:min-h-[36px] ${
                  canPick
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "cursor-default"
                }`}
                onClick={() => {
                  if (!canPick) return;
                  if (slot) {
                    handleMakePick(player.id, slot);
                  } else {
                    handleSelectProspect(player.id);
                  }
                }}
              >
                {player.rank && (
                  <span className="text-xs font-bold text-[var(--text-muted)] w-5 text-right shrink-0">
                    #{player.rank}
                  </span>
                )}
                <PlayerAvatar player={player} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate sm:text-sm">
                      {player.name}
                    </span>
                    <span className="text-xs text-[var(--steelers-gold)] shrink-0">
                      {player.position}
                    </span>
                    {slot?.teamNeeds && matchesAnyNeed(player.position, slot.teamNeeds) && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">Need</span>
                    )}
                    {player.fortyTime && (
                      <span className={`font-mono text-[10px] ${fortyTimeColor(player.position, player.fortyTime)}`}>
                        {player.fortyTime.toFixed(2)}
                      </span>
                    )}
                    {player.consensusLow != null && player.consensusHigh != null && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:inline">
                        {player.consensusLow === player.consensusHigh
                          ? `Pick ${player.consensusLow}`
                          : `${player.consensusLow}-${player.consensusHigh}`}
                      </span>
                    )}
                    {activeSlot && player.consensusLow != null && player.consensusHigh != null && (
                      activeSlot < player.consensusLow
                        ? <span className="text-[9px] font-semibold text-blue-700/70 hidden sm:inline">Reach</span>
                        : activeSlot > player.consensusHigh
                        ? <span className="text-[9px] font-semibold text-amber-700/70 hidden sm:inline">Steal</span>
                        : <span className="text-[9px] font-semibold text-green-700/70 hidden sm:inline">In range</span>
                    )}
                  </div>
                </div>
                {/* Info button — always visible */}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleProspectExpand(player.id);
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition sm:h-6 sm:w-6 ${
                    isExpanded
                      ? "bg-[var(--steelers-gold)] text-[var(--accent-text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--steelers-gold)]"
                  }`}
                  title="View scouting report"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.75 10.5h-1.5v-4h1.5v4zm0-5.5h-1.5V3.5h1.5V5z" />
                  </svg>
                </span>
              </div>

              {/* Inline expansion */}
              {isExpanded && (
                <InlineProspectDetail
                  player={player}
                  onClose={() => setExpandedProspectId(null)}
                />
              )}
            </div>
          );
        })}
        {filteredPlayers.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">
            No players match your search
          </p>
        )}
      </div>
    </>
  );

  const filledCount = existingPicks.length;
  const totalSlots = draftOrder.length;
  const remaining = totalSlots - filledCount;
  const progressPct = totalSlots > 0 ? Math.round((filledCount / totalSlots) * 100) : 0;
  const isComplete = filledCount >= totalSlots;

  return (
    <div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr] md:gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
      {/* Draft board column — always visible (drawer-only mobile UX) */}
      <div className="space-y-1 sm:space-y-1.5">
        {/* Auto-save indicator */}
        <div className={`flex items-center justify-end gap-1.5 text-xs transition-opacity duration-300 ${saveFlash ? "opacity-100" : "opacity-0"}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700">
            <path d="M2 7l3.5 3.5L12 3" />
          </svg>
          <span className="text-green-700 font-medium">Saved</span>
        </div>

        {draftOrder.map((slot) => {
          const pick = pickMap.get(slot.pickNumber);
          const isActive = activeSlot === slot.pickNumber;
          const isExpanded = pick && expandedPickId === pick.playerId;
          const isUserTeam =
            !!favoriteTeamAbbr &&
            slot.teamAbbreviation.toUpperCase() === favoriteTeamAbbr.toUpperCase();

          const isFlashed = flashedSlot === slot.pickNumber;

          return (
            <div key={slot.pickNumber} data-pick-slot={slot.pickNumber} className="rounded-md overflow-hidden sm:rounded-lg scroll-mt-20">
              {/* Pick row */}
              <div
                className={`flex items-center gap-1.5 border px-1.5 py-1 transition cursor-pointer shadow-sm sm:gap-2.5 sm:px-3 sm:py-2 ${
                  isFlashed
                    ? "ring-2 ring-[var(--accent-primary)] bg-[var(--accent-light)] border-[var(--accent-primary)]"
                    : isUserTeam
                    ? "border-l-4 border-l-[var(--accent-primary)] border-y border-r border-y-[var(--border)] border-r-[var(--border)] bg-[var(--accent-light)]"
                    : pick
                    ? "border-[var(--border)] bg-[var(--bg-card)]"
                    : isActive
                    ? "border-[var(--steelers-gold)] bg-[var(--bg-card)] ring-2 ring-[var(--steelers-gold)]/30"
                    : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--steelers-gold)]/40"
                }`}
                onClick={() => !pick && !readOnly && setActiveSlot(isActive ? null : slot.pickNumber)}
              >
                {/* Pick number + team logo */}
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white sm:h-8 sm:w-8 sm:rounded-md sm:text-xs"
                    style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}
                  >
                    {slot.pickNumber}
                  </div>
                  {slot.teamLogoUrl && (
                    <Image
                      src={slot.teamLogoUrl}
                      alt={slot.teamAbbreviation}
                      width={24}
                      height={24}
                      className="shrink-0 hidden sm:block"
                    />
                  )}
                  {isUserTeam && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--accent-primary)]"
                      title="Your team"
                    >
                      Your Team
                    </span>
                  )}
                </div>

                {/* Player headshot (when picked) */}
                {pick && (
                  <div className="shrink-0">
                    <PlayerAvatar
                      player={{
                        name: pick.playerName,
                        imageUrl: pick.playerImageUrl,
                        position: pick.playerPosition,
                      }}
                      size={28}
                    />
                  </div>
                )}

                {/* Team + pick info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">
                      {slot.teamAbbreviation}
                    </span>
                    {tradesByPick?.[slot.pickNumber] && (
                      <TradeIndicator
                        tradeId={tradesByPick[slot.pickNumber].tradeId}
                        previousTeamAbbreviation={tradesByPick[slot.pickNumber].previousTeamAbbreviation}
                        newTeamAbbreviation={tradesByPick[slot.pickNumber].newTeamAbbreviation}
                        size={11}
                        className="shrink-0"
                      />
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline sm:text-xs">{slot.teamName}</span>
                    {slot.note && (
                      <span className="text-[9px] text-amber-600/70 sm:text-[10px]">({slot.note})</span>
                    )}
                  </div>
                  {pick ? (
                    <>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 sm:gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] sm:text-sm">
                        {pick.playerName}
                      </span>
                      <span className="text-[10px] text-[var(--steelers-gold)] sm:text-xs">
                        {pick.playerPosition}
                      </span>
                      {pick.playerFortyTime && (
                        <span className={`font-mono text-[9px] font-semibold sm:text-[10px] ${fortyTimeColor(pick.playerPosition, pick.playerFortyTime)}`}>
                          {pick.playerFortyTime.toFixed(2)}s
                        </span>
                      )}
                      {(() => {
                        const pg = gradePick(slot.pickNumber, pick.playerGrade, pick.playerRank);
                        return (
                          <>
                            <PickGradeBadge grade={pg.letterGrade} label={pg.pickLabel} />
                            <span className={`text-[9px] font-semibold sm:text-[10px] ${
                              pg.letterGrade === 'A+' || pg.letterGrade === 'A' ? 'text-green-700'
                              : pg.letterGrade === 'B+' || pg.letterGrade === 'B' ? 'text-blue-700'
                              : pg.letterGrade === 'C+' || pg.letterGrade === 'C' ? 'text-yellow-700'
                              : pg.letterGrade === 'D' ? 'text-orange-700'
                              : 'text-red-700'
                            }`}>
                              {pg.pickLabel}
                            </span>
                          </>
                        );
                      })()}
                      <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline sm:text-xs">
                        {pick.playerSchool}
                      </span>
                      {(() => {
                        const nm = checkNeedMatch(pick.playerPosition, slot.teamNeeds);
                        if (nm.tier === "top" && nm.needIndex === 0) return <span className="text-[9px] font-semibold text-green-700 sm:text-[10px]">● Top Need</span>;
                        if (nm.tier === "top") return <span className="text-[9px] font-semibold text-green-700/80 sm:text-[10px]">● Key Need</span>;
                        if (nm.tier === "match" && nm.needIndex !== null) return <span className="text-[9px] font-semibold text-sky-700/60 sm:text-[10px]">● Fits Need</span>;
                        if (nm.tier === "off") return <span className="text-[9px] font-semibold text-amber-700/60 sm:text-[10px]">○ Off-need</span>;
                        return null;
                      })()}
                    </div>
                    {slot.teamNeeds && slot.teamNeeds.length > 0 && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Needs: {slot.teamNeeds.slice(0, 4).join(", ")}
                      </p>
                    )}
                    </>
                  ) : (
                    <>
                      <p className={`text-[10px] mt-0.5 sm:text-xs ${isActive ? "text-[var(--steelers-gold)] font-medium" : "text-[var(--text-muted)]"}`}>
                        {isActive ? "Select a player →" : "Click to pick"}
                      </p>
                      {slot.teamNeeds && slot.teamNeeds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {slot.teamNeeds.slice(0, 3).map((pos) => (
                            <span key={pos} className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                              {pos}
                            </span>
                          ))}
                          {slot.teamNeeds.length > 3 && (
                            <span className="text-[10px] text-[var(--text-muted)]/60">+{slot.teamNeeds.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Info + Remove buttons */}
                {pick && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePickExpand(pick.playerId);
                      }}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition sm:h-7 sm:w-7 ${
                        isExpanded
                          ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)] text-[var(--accent-text)]"
                          : "border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10 text-[var(--steelers-gold)] hover:bg-[var(--steelers-gold)]/25"
                      }`}
                      title="View scouting report"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.75 10.5h-1.5v-4h1.5v4zm0-5.5h-1.5V3.5h1.5V5z" />
                      </svg>
                    </button>
                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePick(pick.id, pick.playerId);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-xs text-red-700/60 hover:bg-red-50 hover:text-red-700 transition sm:h-7 sm:w-7"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline note edit / preview — personal notes FIRST */}
              {pick && !readOnly && (
                editingNotePickId === pick.id ? (
                  <div className="ml-10 mt-2 mb-1">
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      placeholder="Why this player here? What makes this pick interesting?"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--steelers-gold)] focus:outline-none resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(async () => {
                            await updatePickAnalysis(pick.id, editingNoteText);
                            setEditingNotePickId(null);
                            flashSaved();
                          });
                        }}
                        disabled={isPending}
                        className="rounded-md bg-[var(--steelers-gold)] px-3 py-1 text-[10px] font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 disabled:opacity-50 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingNotePickId(null); }}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : pick.analysis ? (
                  <div
                    className="ml-10 mt-2 rounded-md bg-[var(--accent-primary)]/10 border-l-4 border-l-[var(--accent-primary)] border-y border-r border-y-[var(--border-light)] border-r-[var(--border-light)] px-3 py-2 cursor-pointer hover:bg-[var(--accent-primary)]/15 transition group relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNotePickId(pick.id);
                      setEditingNoteText(pick.analysis || "");
                    }}
                  >
                    <span className="text-sm text-[var(--accent-primary)]/40 font-serif leading-none">{"\u201C"}</span>
                    <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed line-clamp-2">{pick.analysis}</p>
                    <p className="text-[9px] text-[var(--accent-primary)] uppercase tracking-wider font-semibold mt-1">Your Take</p>
                    <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-[var(--text-muted)]">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.15 2.15a1.5 1.5 0 0 1 2.12 2.12l-8.5 8.5-3 .88.88-3 8.5-8.5z" />
                      </svg>
                    </span>
                  </div>
                ) : (
                  <div
                    className="ml-10 mt-2 rounded-md border border-dashed border-[var(--border)] px-3 py-2 cursor-pointer hover:bg-gray-50 hover:border-[var(--border)] transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNotePickId(pick.id);
                      setEditingNoteText("");
                    }}
                  >
                    <p className="text-[11px] text-[var(--text-muted)] italic hover:text-[var(--text-muted)] flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
                        <path d="M12.15 2.15a1.5 1.5 0 0 1 2.12 2.12l-8.5 8.5-3 .88.88-3 8.5-8.5z" />
                      </svg>
                      Add your take on this pick...
                    </p>
                  </div>
                )
              )}

              {/* Auto-generated commentary — secondary to personal notes */}
              {pick && (() => {
                const pg = gradePick(slot.pickNumber, pick.playerGrade, pick.playerRank);
                const boardCtx = {
                  picksSoFar: existingPicks
                    .filter((ep) => ep.pickNumber < slot.pickNumber)
                    .map((ep) => ({ position: ep.playerPosition, pickNumber: ep.pickNumber })),
                  totalPicks: existingPicks.filter((ep) => ep.pickNumber <= slot.pickNumber).length,
                };
                const commentary = generatePickCommentary(
                  {
                    pickNumber: slot.pickNumber,
                    playerName: pick.playerName,
                    playerPosition: pick.playerPosition,
                    playerGrade: pick.playerGrade,
                    playerRank: pick.playerRank,
                    playerPositionRank: pick.playerPositionRank ?? null,
                    playerNflComparison: pick.playerNflComparison ?? null,
                    teamName: slot.teamName,
                    teamAbbreviation: slot.teamAbbreviation,
                  },
                  pg,
                  boardCtx
                );
                return (
                  <div className="ml-10 mt-1 hidden sm:block">
                    <p className="text-[9px] text-[var(--text-muted)]/60 uppercase tracking-wider font-semibold mb-0.5">AI Analysis</p>
                    <div
                      className="border-l-2 pl-2 text-[11px] italic text-[var(--text-muted)]"
                      style={{ borderColor: gradeColorHex(pg.letterGrade) }}
                    >
                      {commentary}
                    </div>
                  </div>
                );
              })()}

              {/* Inline expansion for picked player */}
              {isExpanded && pick && (
                <InlineProspectDetail
                  player={pickToPlayer(pick)}
                  pickNumber={slot.pickNumber}
                  teamName={slot.teamName}
                  teamNeeds={slot.teamNeeds}
                  onClose={() => setExpandedPickId(null)}
                />
              )}
            </div>
          );
        })}

        {/* Auto-fill buttons */}
        {!readOnly && totalEmpty > 0 && (
          <div className="mt-2 flex gap-2">
            {emptyInRound > 0 && (
              <button
                onClick={() => handleAutoFill("round")}
                disabled={isPending}
                className="flex-1 rounded-lg border border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10 py-2 text-xs font-semibold text-[var(--steelers-gold)] hover:bg-[var(--steelers-gold)]/20 transition disabled:opacity-50"
              >
                {isPending ? "Filling..." : `Auto-Fill Rd ${currentRound} (${emptyInRound})`}
              </button>
            )}
            <button
              onClick={() => handleAutoFill("all")}
              disabled={isPending}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 text-xs font-semibold text-gray-400 hover:text-[var(--text-primary)] hover:bg-gray-50 transition disabled:opacity-50"
            >
              {isPending ? "Filling..." : `Auto-Fill All (${totalEmpty})`}
            </button>
          </div>
        )}

        {/* Publish button */}
        {!readOnly && boardStatus === "draft" && existingPicks.length > 0 && (
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="mt-4 w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-green-500 transition disabled:opacity-50"
          >
            {isPending ? "Publishing..." : "Publish Board"}
          </button>
        )}
      </div>

      {/* Prospect pool column — desktop sidebar only. Mobile uses the slide-up drawer below. */}
      <div className="hidden md:block md:max-h-[calc(100vh-100px)] md:overflow-y-auto">
        <div className="md:hidden mb-3">
          <h3
            className="text-sm font-bold text-[var(--text-primary)] tracking-wide uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AVAILABLE PROSPECTS
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[var(--steelers-gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              {realAvailable.length}
            </span>
          </h3>
        </div>
        {prospectPoolContent}
      </div>
    </div>

    {/* Mobile sticky bottom bar — drawer is the only mobile prospect-browse path */}
    {!readOnly && (
      <>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 pt-3 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold truncate ${isComplete ? "text-green-700" : "text-[var(--text-primary)]"}`}>
                {filledCount}/{totalSlots}
                {isComplete ? (
                  <span className="ml-2 text-xs font-medium text-green-700">All picks made</span>
                ) : (
                  <span className="ml-2 text-xs font-medium text-[var(--text-secondary)]">
                    — {remaining} {remaining === 1 ? "slot" : "slots"} open
                  </span>
                )}
              </p>
              {/* Progress bar */}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="shrink-0 rounded-full bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-text)] shadow-md hover:bg-[var(--accent-secondary)] transition"
            >
              Browse Prospects
            </button>
          </div>
        </div>

        {/* Drawer + backdrop */}
        <div
          className={`md:hidden fixed inset-0 z-50 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-hidden={!drawerOpen}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`absolute inset-x-0 bottom-0 h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-gray-200">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
                Available Prospects
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                  {realAvailable.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-gray-100 transition"
                aria-label="Close prospects drawer"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
              {prospectPoolContent}
            </div>
          </div>
        </div>
      </>
    )}
    </div>
  );
}
