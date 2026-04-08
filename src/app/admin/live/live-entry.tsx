"use client";

import { useState, useTransition } from "react";
import { enterActualResult, undoLastResult } from "@/lib/actions";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  note: string | null;
};

type Player = {
  id: string;
  name: string;
  position: string;
  school: string;
  rank: number | null;
};

type ExistingResult = {
  id: string;
  pickNumber: number;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
};

type Props = {
  season: number;
  draftOrder: DraftSlot[];
  availablePlayers: Player[];
  existingResults: ExistingResult[];
};

export function LiveResultsEntry({
  season,
  draftOrder,
  availablePlayers,
  existingResults,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [lastConfirm, setLastConfirm] = useState<string | null>(null);

  const resultMap = new Map(existingResults.map((r) => [r.pickNumber, r]));

  const positions = ["ALL", ...Array.from(new Set(availablePlayers.map((p) => p.position))).sort()];

  const filteredPlayers = availablePlayers.filter(
    (p) =>
      (posFilter === "ALL" || p.position === posFilter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       p.position.toLowerCase().includes(search.toLowerCase()) ||
       p.school.toLowerCase().includes(search.toLowerCase()))
  );

  // Find the next empty slot
  const nextSlot = draftOrder.find((s) => !resultMap.has(s.pickNumber));

  function handleEnterResult(playerId: string, slot: DraftSlot) {
    const player = availablePlayers.find((p) => p.id === playerId);
    startTransition(async () => {
      await enterActualResult(season, slot.pickNumber, playerId, slot.teamId);
      setActiveSlot(null);
      setSearch("");
      setLastConfirm(
        `Pick #${slot.pickNumber}: ${player?.name || "Player"} → ${slot.teamAbbreviation}`
      );
      setTimeout(() => setLastConfirm(null), 4000);
    });
  }

  function handleUndo() {
    startTransition(async () => {
      await undoLastResult(season);
      setLastConfirm(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Confirmation toast */}
      {lastConfirm && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-green-400">
            &#10003; {lastConfirm}
          </span>
          <button
            onClick={handleUndo}
            disabled={isPending}
            className="rounded px-3 py-1 text-xs font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 transition"
          >
            Undo
          </button>
        </div>
      )}

      {/* Undo button (always visible if results exist and no toast) */}
      {!lastConfirm && existingResults.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUndo}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-xs font-medium text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 transition disabled:opacity-50"
          >
            Undo Last Pick
          </button>
        </div>
      )}

      {/* Mobile-friendly: player search at top when a slot is active */}
      {activeSlot && (
        <div className="rounded-xl border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/5 p-4 lg:hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">
              Pick #{activeSlot} —{" "}
              {draftOrder.find((s) => s.pickNumber === activeSlot)?.teamAbbreviation}
            </h3>
            <button
              onClick={() => setActiveSlot(null)}
              className="text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="mb-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredPlayers.map((player) => {
              const slot = draftOrder.find((s) => s.pickNumber === activeSlot)!;
              return (
                <button
                  key={player.id}
                  disabled={isPending}
                  onClick={() => handleEnterResult(player.id, slot)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--lions-blue)]/10 transition active:bg-[var(--lions-blue)]/20"
                >
                  {player.rank && (
                    <span className="text-xs font-bold text-[var(--lions-blue)]/60 w-5 text-right shrink-0">
                      #{player.rank}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-white">
                    {player.name}
                  </span>
                  <span className="text-xs text-[var(--lions-blue)]">
                    {player.position}
                  </span>
                  <span className="ml-auto text-xs text-white/30">
                    {player.school}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Draft slots */}
        <div className="space-y-1.5">
          {draftOrder.map((slot) => {
            const result = resultMap.get(slot.pickNumber);
            const isActive = activeSlot === slot.pickNumber;
            const isNext = nextSlot?.pickNumber === slot.pickNumber && !activeSlot;

            return (
              <div
                key={slot.pickNumber}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition cursor-pointer ${
                  result
                    ? "border-green-500/20 bg-green-500/5"
                    : isActive
                    ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/10"
                    : isNext
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
                onClick={() => !result && setActiveSlot(isActive ? null : slot.pickNumber)}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}
                >
                  {slot.pickNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white/50">
                      {slot.teamAbbreviation}
                    </span>
                    <span className="text-xs text-white/30">{slot.teamName}</span>
                  </div>
                  {result ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-green-400">
                        {result.playerName}
                      </span>
                      <span className="text-xs text-green-400/70">
                        {result.playerPosition}
                      </span>
                      <span className="text-xs text-white/30">
                        {result.playerSchool}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 mt-0.5">
                      {isActive
                        ? "Select player below →"
                        : isNext
                        ? "ON THE CLOCK"
                        : "—"}
                    </p>
                  )}
                </div>
                {result && (
                  <span className="text-xs text-green-500/60">&#10003;</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop sidebar: player search */}
        <div className="hidden lg:block rounded-xl border border-white/10 bg-white/5 p-4 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <h2
            className="mb-3 text-lg font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {activeSlot ? `PICK #${activeSlot}` : "SELECT A SLOT"}
          </h2>
          <input
            type="text"
            placeholder="Search name, position, school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
          />
          <div className="mb-3 flex gap-1 flex-wrap">
            {positions.map((pos) => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${
                  posFilter === pos
                    ? "bg-[var(--lions-blue)] text-white"
                    : "bg-white/5 text-white/40 hover:text-white/60"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {filteredPlayers.map((player) => {
              const slot = activeSlot
                ? draftOrder.find((s) => s.pickNumber === activeSlot)
                : null;

              return (
                <button
                  key={player.id}
                  disabled={!activeSlot || isPending}
                  onClick={() => slot && handleEnterResult(player.id, slot)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                    activeSlot
                      ? "hover:bg-[var(--lions-blue)]/10 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {player.rank && (
                    <span className="text-xs font-bold text-[var(--lions-blue)]/60 w-5 text-right shrink-0">
                      #{player.rank}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-white">
                    {player.name}
                  </span>
                  <span className="text-xs text-[var(--lions-blue)]">
                    {player.position}
                  </span>
                  <span className="ml-auto text-xs text-white/30">
                    {player.school}
                  </span>
                </button>
              );
            })}
            {filteredPlayers.length === 0 && (
              <p className="py-4 text-center text-sm text-white/30">
                No available players
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
