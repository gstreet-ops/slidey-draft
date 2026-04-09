"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { makePick, removePick, publishBoard, autoFillByRank } from "@/lib/actions";
import { PlayerAvatar } from "@/components/player-avatar";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl: string | null;
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
};

type Props = {
  boardId: string;
  boardStatus: string;
  draftOrder: DraftSlot[];
  existingPicks: ExistingPick[];
  availablePlayers: Player[];
  readOnly?: boolean;
};

/* ── Inline detail panel (ESPN-style) ────────────────────────── */

function gradeColor(grade: number): string {
  if (grade >= 90) return "text-green-600 bg-green-50 border-green-200";
  if (grade >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
  if (grade >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function InlineProspectDetail({ player, onClose }: { player: Player; onClose: () => void }) {
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
    <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
      {/* Header: avatar + name + basics */}
      <div className="flex items-start gap-3 mb-3">
        <PlayerAvatar player={player} size={56} />
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-bold text-gray-900 tracking-wide sm:text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {player.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-block rounded-full bg-[var(--lions-blue)] px-2 py-0.5 text-[10px] font-bold text-white">
              {player.position}
            </span>
            <span className="text-xs text-gray-500">
              {player.height && `${player.height}`}
              {player.height && player.weight && " · "}
              {player.weight && `${player.weight} lbs`}
            </span>
            <span className="text-xs text-gray-400">{player.school}</span>
          </div>
          {player.nflComparison && (
            <p className="mt-1 text-[11px] text-gray-400">
              NFL Comp: <span className="font-semibold text-gray-600">{player.nflComparison}</span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600 transition"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      {/* Stats bar: POS RK / OVR RK / GRADE */}
      {(player.positionRank || player.rank || player.grade) && (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
          {player.positionRank && (
            <div className="flex-1 border-r border-gray-200 px-3 py-2 text-center bg-white">
              <p className="text-lg font-bold text-gray-900">{player.positionRank}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">POS RK</p>
            </div>
          )}
          {player.rank && (
            <div className="flex-1 border-r border-gray-200 px-3 py-2 text-center bg-white">
              <p className="text-lg font-bold text-gray-900">{player.rank}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">OVR RK</p>
            </div>
          )}
          {player.grade && (
            <div className="flex-1 px-3 py-2 text-center bg-white">
              <p className={`inline-flex items-center justify-center rounded border px-2 py-0.5 text-lg font-bold ${gradeColor(player.grade)}`}>
                {player.grade}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">GRADE</p>
            </div>
          )}
        </div>
      )}

      {/* Measurables mini-grid */}
      {measurables.length > 0 && (
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 mb-3">
          {measurables.map((m, i) => (
            <div key={m.label} className={`px-2 py-1.5 text-center ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
              <p className="text-xs font-bold text-gray-900">{m.value}</p>
              <p className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pre-Draft Analysis */}
      {player.notes && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Pre-Draft Analysis</h4>
          <p className="text-xs leading-relaxed text-gray-600">{player.notes}</p>
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

  const pickMap = new Map(existingPicks.map((p) => [p.pickNumber, p]));

  const allPickedIds = new Set([
    ...existingPicks.map((p) => p.playerId),
    ...localPickedIds,
  ]);

  const realAvailable = availablePlayers.filter((p) => !allPickedIds.has(p.id));

  const positions = ["ALL", ...Array.from(new Set(realAvailable.map((p) => p.position))).sort()];

  const filteredPlayers = realAvailable.filter(
    (p) =>
      (posFilter === "ALL" || p.position === posFilter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       p.position.toLowerCase().includes(search.toLowerCase()) ||
       p.school.toLowerCase().includes(search.toLowerCase()))
  );

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
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {pickError}
        </div>
      )}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <h2
            className="text-sm font-bold text-white tracking-wide sm:text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PROSPECT POOL
          </h2>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/40">
            Next Best Prospect
          </span>
        </div>
        {activeSlot && (
          <p className="text-xs text-[var(--lions-blue)] mt-0.5">
            Select for Pick #{activeSlot} &mdash; {draftOrder.find((s) => s.pickNumber === activeSlot)?.teamName}
          </p>
        )}
      </div>
      <input
        type="text"
        placeholder="Search prospects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-xs text-white placeholder:text-white/50 focus:border-[var(--lions-blue)] focus:outline-none sm:px-3 sm:py-2 sm:text-sm"
      />
      <div className="mb-2 flex gap-0.5 flex-wrap overflow-x-auto scrollbar-none sm:mb-3 sm:gap-1">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold transition sm:px-2 sm:py-1 sm:text-xs ${
              posFilter === pos
                ? "bg-[var(--lions-blue)] text-white"
                : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Analysis text area */}
      {activeSlot && !readOnly && (
        <div className="mb-3">
          <textarea
            placeholder="Why this pick? (optional analysis)"
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none resize-none"
            rows={2}
          />
        </div>
      )}

      <div className="space-y-1">
        {filteredPlayers.map((player) => {
          const slot = activeSlot
            ? draftOrder.find((s) => s.pickNumber === activeSlot)
            : null;
          const isExpanded = expandedProspectId === player.id;
          const canPick = !!activeSlot && !readOnly;

          return (
            <div key={player.id} className="rounded-md overflow-hidden sm:rounded-lg">
              {/* Row */}
              <div
                className={`flex items-center gap-1.5 bg-white px-1.5 py-1 text-left shadow-sm transition min-h-[30px] sm:gap-2 sm:px-2.5 sm:py-1.5 sm:min-h-[36px] ${
                  canPick
                    ? "hover:bg-gray-50 hover:shadow-md cursor-pointer"
                    : "cursor-default"
                }`}
                onClick={() => canPick && slot && handleMakePick(player.id, slot)}
              >
                {player.rank && (
                  <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">
                    #{player.rank}
                  </span>
                )}
                <PlayerAvatar player={player} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-900 truncate sm:text-sm">
                      {player.name}
                    </span>
                    <span className="text-xs text-[var(--lions-blue)] shrink-0">
                      {player.position}
                    </span>
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
                      ? "bg-[var(--lions-blue)] text-white"
                      : "text-gray-300 hover:text-[var(--lions-blue)]"
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
          <p className="py-4 text-center text-sm text-gray-400">
            No players match your search
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-2 sm:grid-cols-[1.2fr_1fr] sm:gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
      {/* Draft board column */}
      <div className="space-y-1 sm:space-y-1.5 max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
        {/* Auto-save indicator */}
        <div className={`flex items-center justify-end gap-1.5 text-xs transition-opacity duration-300 ${saveFlash ? "opacity-100" : "opacity-0"}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
            <path d="M2 7l3.5 3.5L12 3" />
          </svg>
          <span className="text-green-400 font-medium">Saved</span>
        </div>

        {draftOrder.map((slot) => {
          const pick = pickMap.get(slot.pickNumber);
          const isActive = activeSlot === slot.pickNumber;
          const isExpanded = pick && expandedPickId === pick.playerId;

          return (
            <div key={slot.pickNumber} className="rounded-md overflow-hidden sm:rounded-lg">
              {/* Pick row */}
              <div
                className={`flex items-center gap-1.5 border px-1.5 py-1 transition cursor-pointer shadow-sm sm:gap-2.5 sm:px-3 sm:py-2 ${
                  pick
                    ? "border-gray-200 bg-white"
                    : isActive
                    ? "border-[var(--lions-blue)] bg-white ring-2 ring-[var(--lions-blue)]/30"
                    : "border-gray-200 bg-white hover:border-[var(--lions-blue)]/40"
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
                    <span className="text-[10px] font-semibold text-gray-500 sm:text-xs">
                      {slot.teamAbbreviation}
                    </span>
                    <span className="text-[10px] text-gray-400 hidden sm:inline sm:text-xs">{slot.teamName}</span>
                    {slot.note && (
                      <span className="text-[9px] text-amber-600/70 sm:text-[10px]">({slot.note})</span>
                    )}
                  </div>
                  {pick ? (
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 sm:gap-2">
                      <span className="text-xs font-semibold text-gray-900 sm:text-sm">
                        {pick.playerName}
                      </span>
                      <span className="text-[10px] text-[var(--lions-blue)] sm:text-xs">
                        {pick.playerPosition}
                      </span>
                      {pick.playerGrade && (
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold sm:h-6 sm:w-6 sm:text-[10px] ${
                          pick.playerGrade >= 90 ? "bg-green-500/20 text-green-400"
                          : pick.playerGrade >= 80 ? "bg-blue-500/20 text-blue-400"
                          : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {pick.playerGrade}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 hidden sm:inline sm:text-xs">
                        {pick.playerSchool}
                      </span>
                    </div>
                  ) : (
                    <p className={`text-[10px] mt-0.5 sm:text-xs ${isActive ? "text-[var(--lions-blue)] font-medium" : "text-gray-400"}`}>
                      {isActive ? "Select a player →" : "Click to pick"}
                    </p>
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
                          ? "border-[var(--lions-blue)] bg-[var(--lions-blue)] text-white"
                          : "border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 text-[var(--lions-blue)] hover:bg-[var(--lions-blue)]/25"
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
                        className="flex h-6 w-6 items-center justify-center rounded text-xs text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition sm:h-7 sm:w-7"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline expansion for picked player */}
              {isExpanded && pick && (
                <InlineProspectDetail
                  player={pickToPlayer(pick)}
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
                className="flex-1 rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 py-2 text-xs font-semibold text-[var(--lions-blue)] hover:bg-[var(--lions-blue)]/20 transition disabled:opacity-50"
              >
                {isPending ? "Filling..." : `Auto-Fill Rd ${currentRound} (${emptyInRound})`}
              </button>
            )}
            <button
              onClick={() => handleAutoFill("all")}
              disabled={isPending}
              className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
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
            className="mt-4 w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition disabled:opacity-50"
          >
            {isPending ? "Publishing..." : "Publish Board"}
          </button>
        )}
      </div>

      {/* Prospect pool column (always visible) */}
      <div className="max-h-[calc(100vh-100px)] overflow-y-auto">
        {prospectPoolContent}
      </div>
    </div>
  );
}
