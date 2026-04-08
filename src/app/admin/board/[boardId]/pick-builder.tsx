"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { makePick, removePick, publishBoard } from "@/lib/actions";
import { PlayerAvatar } from "@/components/player-avatar";
import { ProspectDetailDrawer } from "@/components/prospect-detail-drawer";
import { ProspectHoverCard } from "@/components/prospect-hover-card";
import { extractTraitTags } from "@/lib/trait-tags";

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
};

type Props = {
  boardId: string;
  boardStatus: string;
  draftOrder: DraftSlot[];
  existingPicks: ExistingPick[];
  availablePlayers: Player[];
  readOnly?: boolean;
};

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
  const [drawerPlayer, setDrawerPlayer] = useState<Player | null>(null);

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

  function handleMakePick(playerId: string, slot: DraftSlot) {
    setLocalPickedIds((prev) => new Set([...prev, playerId]));
    const analysis = analysisText.trim() || undefined;
    startTransition(async () => {
      await makePick(boardId, slot.pickNumber, playerId, slot.teamId, analysis);
      setActiveSlot(null);
      setSearch("");
      setAnalysisText("");
    });
  }

  function handleRemovePick(pickId: string) {
    startTransition(async () => {
      await removePick(pickId, boardId);
    });
  }

  function handlePublish() {
    startTransition(async () => {
      await publishBoard(boardId);
    });
  }

  const showMobileSheet = activeSlot !== null && !readOnly;

  // Prospect pool content (shared between desktop sidebar and mobile bottom sheet)
  const prospectPoolContent = (
    <>
      {activeSlot ? (
        <div className="mb-3">
          <h2
            className="text-lg font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PROSPECT POOL
          </h2>
          <p className="text-xs text-[var(--lions-blue)]">
            Select a player for Pick #{activeSlot} &mdash; {draftOrder.find((s) => s.pickNumber === activeSlot)?.teamName}
          </p>
        </div>
      ) : (
        <h2
          className="mb-3 text-lg font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PROSPECT POOL
        </h2>
      )}
      <input
        type="text"
        placeholder="Search name, position, school..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
      />
      <div className="mb-3 flex gap-1 flex-wrap overflow-x-auto scrollbar-none">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`shrink-0 px-2 py-1 rounded text-xs font-semibold transition ${
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
          const tags = extractTraitTags(player.notes, 2);

          return (
            <div key={player.id} className="flex items-center gap-1.5">
              <button
                disabled={!activeSlot || isPending}
                onClick={() => slot && handleMakePick(player.id, slot)}
                className={`flex flex-1 items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-left shadow-sm transition min-h-[36px] sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5 sm:min-h-[44px] ${
                  activeSlot
                    ? "hover:bg-gray-50 hover:shadow-md cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                {player.rank && (
                  <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">
                    #{player.rank}
                  </span>
                )}
                <PlayerAvatar player={player} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ProspectHoverCard
                      prospect={player}
                      onTap={() => setDrawerPlayer(player)}
                    >
                      <span className="text-xs font-semibold text-gray-900 truncate cursor-pointer underline decoration-gray-300 underline-offset-2 hover:text-[var(--lions-blue)] hover:decoration-[var(--lions-blue)] transition sm:text-sm">
                        {player.name}
                      </span>
                    </ProspectHoverCard>
                    <span className="text-xs text-[var(--lions-blue)] shrink-0">
                      {player.position}
                    </span>
                  </div>
                  {tags.length > 0 && (
                    <div className="hidden gap-1 mt-0.5 sm:flex">
                      {tags.map((t) => (
                        <span key={t.label} className={`rounded-full px-1.5 py-0 text-[9px] font-semibold ${t.color}`}>{t.label}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="ml-auto text-xs text-gray-400 shrink-0 hidden sm:block">
                  {player.school}
                </span>
              </button>
              {/* Info button for drawer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerPlayer(player);
                }}
                className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-[var(--lions-blue)]/40 bg-[var(--lions-blue)]/15 px-1.5 text-[var(--lions-blue)] hover:bg-[var(--lions-blue)]/30 hover:text-white transition sm:h-9 sm:rounded-lg sm:px-2.5"
                title="View scouting report"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.75 10.5h-1.5v-4h1.5v4zm0-5.5h-1.5V3.5h1.5V5z" />
                </svg>
                <span className="text-[10px] font-semibold hidden sm:inline">Scout</span>
              </button>
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
    <>
      <div className="grid grid-cols-[1.1fr_1fr] gap-2 sm:grid-cols-[1.2fr_1fr] sm:gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
        {/* Draft board column */}
        <div className="space-y-1.5 sm:space-y-2 max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
          {draftOrder.map((slot) => {
            const pick = pickMap.get(slot.pickNumber);
            const isActive = activeSlot === slot.pickNumber;

            return (
              <div
                key={slot.pickNumber}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition cursor-pointer shadow-sm sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3 ${
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
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white sm:h-10 sm:w-10 sm:rounded-lg sm:text-sm"
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerPlayer({
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
                      });
                    }}
                    className="shrink-0"
                  >
                    <PlayerAvatar
                      player={{
                        name: pick.playerName,
                        imageUrl: pick.playerImageUrl,
                        position: pick.playerPosition,
                      }}
                      size={36}
                    />
                  </button>
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
                      <ProspectHoverCard
                        prospect={{
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
                        }}
                        onTap={() => setDrawerPlayer({
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
                        })}
                      >
                        <span className="text-xs font-semibold text-gray-900 hover:text-[var(--lions-blue)] transition cursor-pointer sm:text-sm underline decoration-gray-300 underline-offset-2 hover:decoration-[var(--lions-blue)]">
                          {pick.playerName}
                        </span>
                      </ProspectHoverCard>
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
                      {isActive ? "Select a player \u2192" : "Click to pick"}
                    </p>
                  )}
                </div>

                {/* Scout + Remove buttons */}
                {pick && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawerPlayer({
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
                        });
                      }}
                      className="flex h-8 items-center gap-1 rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-2 text-[var(--lions-blue)] hover:bg-[var(--lions-blue)]/25 hover:text-white transition"
                      title="View scouting report"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.75 10.5h-1.5v-4h1.5v4zm0-5.5h-1.5V3.5h1.5V5z" />
                      </svg>
                      <span className="text-[10px] font-semibold">Scout</span>
                    </button>
                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePick(pick.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded text-xs text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Publish button */}
          {!readOnly && boardStatus === "draft" && existingPicks.length > 0 && (
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition disabled:opacity-50"
            >
              {isPending ? "Publishing..." : `Publish Board (${existingPicks.length}/32 picks)`}
            </button>
          )}
        </div>

        {/* Prospect pool sidebar — always visible */}
        {!readOnly && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 sm:p-4 max-h-[calc(100vh-100px)] overflow-y-auto lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)]">
            {prospectPoolContent}
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {showMobileSheet && (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setActiveSlot(null)}
          />
          {/* Sheet */}
          <div className="relative max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[var(--gtown-navy)] p-4 shadow-2xl">
            {/* Drag handle */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            {prospectPoolContent}
          </div>
        </div>
      )}

      {/* Prospect detail drawer */}
      <ProspectDetailDrawer
        prospect={drawerPlayer}
        onClose={() => setDrawerPlayer(null)}
      />
    </>
  );
}
