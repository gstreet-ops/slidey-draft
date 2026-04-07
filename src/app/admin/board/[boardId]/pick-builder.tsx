"use client";

import { useState, useTransition } from "react";
import { makePick, removePick, publishBoard } from "@/lib/actions";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  note: string | null;
};

type ExistingPick = {
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

type Player = {
  id: string;
  name: string;
  position: string;
  school: string;
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
  const [isPending, startTransition] = useTransition();

  const pickMap = new Map(existingPicks.map((p) => [p.pickNumber, p]));

  const filteredPlayers = availablePlayers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.position.toLowerCase().includes(search.toLowerCase()) ||
      p.school.toLowerCase().includes(search.toLowerCase())
  );

  function handleMakePick(playerId: string, slot: DraftSlot) {
    startTransition(async () => {
      await makePick(boardId, slot.pickNumber, playerId, slot.teamId);
      setActiveSlot(null);
      setSearch("");
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Draft board column */}
      <div className="space-y-2">
        {draftOrder.map((slot) => {
          const pick = pickMap.get(slot.pickNumber);
          const isActive = activeSlot === slot.pickNumber;

          return (
            <div
              key={slot.pickNumber}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition cursor-pointer ${
                pick
                  ? "border-white/10 bg-white/5"
                  : isActive
                  ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
              onClick={() => !pick && !readOnly && setActiveSlot(isActive ? null : slot.pickNumber)}
            >
              {/* Pick number */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: slot.teamPrimaryColor || "#333" }}
              >
                {slot.pickNumber}
              </div>

              {/* Team + pick info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/50">
                    {slot.teamAbbreviation}
                  </span>
                  <span className="text-xs text-white/30">{slot.teamName}</span>
                  {slot.note && (
                    <span className="text-[10px] text-yellow-400/70">({slot.note})</span>
                  )}
                </div>
                {pick ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-semibold text-white">
                      {pick.playerName}
                    </span>
                    <span className="text-xs text-[var(--lions-blue)]">
                      {pick.playerPosition}
                    </span>
                    <span className="text-xs text-white/30">
                      {pick.playerSchool}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-white/30 mt-0.5">
                    {isActive ? "Select a player →" : "Click to pick"}
                  </p>
                )}
              </div>

              {/* Remove button */}
              {pick && !readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePick(pick.id);
                  }}
                  className="shrink-0 rounded px-2 py-1 text-xs text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition"
                >
                  ✕
                </button>
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

      {/* Player pool sidebar */}
      {!readOnly && (<div className="rounded-xl border border-white/10 bg-white/5 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
        <h2
          className="mb-3 text-lg font-bold text-white tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PROSPECT POOL
        </h2>
        <input
          type="text"
          placeholder="Search name, position, school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
        />
        <div className="space-y-1">
          {filteredPlayers.map((player) => {
            const slot = activeSlot
              ? draftOrder.find((s) => s.pickNumber === activeSlot)
              : null;

            return (
              <button
                key={player.id}
                disabled={!activeSlot || isPending}
                onClick={() => slot && handleMakePick(player.id, slot)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                  activeSlot
                    ? "hover:bg-[var(--lions-blue)]/10 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
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
              No players match your search
            </p>
          )}
        </div>
      </div>)}
    </div>
  );
}
