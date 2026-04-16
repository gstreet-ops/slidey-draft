"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { submitPropPick } from "@/lib/actions";

type Prop = {
  id: string;
  question: string;
  type: string;
  options: unknown;
  points: number;
  status: string;
  category: string;
  correctAnswer: string | null;
};

type Player = { id: string; name: string; position: string; school: string };
type Team = { id: string; name: string; abbreviation: string; logoUrl: string | null };

const CATEGORY_LABELS: Record<string, string> = {
  position: "POSITION PROPS",
  trade: "TRADE PROPS",
  fun: "FUN PROPS",
  general: "GENERAL",
  team: "TEAM PROPS",
};

const CATEGORY_ORDER = ["position", "trade", "fun", "general", "team"];

export function PropsClient({
  props,
  pickMap: initialPickMap,
  poolId,
  players,
  teams,
}: {
  props: Prop[];
  pickMap: Record<string, string>;
  poolId: string;
  players: Player[];
  teams: Team[];
}) {
  const [pickMap, setPickMap] = useState(initialPickMap);
  const [isPending, startTransition] = useTransition();
  const [savingPropId, setSavingPropId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState<Record<string, string>>({});

  function handleSubmit(propId: string, answer: string) {
    setSavingPropId(propId);
    setPickMap((prev) => ({ ...prev, [propId]: answer }));
    startTransition(async () => {
      try {
        await submitPropPick(propId, poolId, answer);
      } catch {
        // revert on error
        setPickMap((prev) => {
          const next = { ...prev };
          delete next[propId];
          return next;
        });
      } finally {
        setSavingPropId(null);
      }
    });
  }

  // Group by category
  const grouped = new Map<string, Prop[]>();
  for (const prop of props) {
    const cat = prop.category || "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(prop);
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));
  // Add any remaining categories not in the order
  for (const cat of grouped.keys()) {
    if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
  }

  return (
    <div className="space-y-8">
      {sortedCategories.map((cat) => (
        <div key={cat}>
          <h2
            className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {CATEGORY_LABELS[cat] || cat.toUpperCase()}
          </h2>
          <div className="space-y-3">
            {grouped.get(cat)!.map((prop) => {
              const userPick = pickMap[prop.id];
              const isLocked = prop.status === "locked";
              const isResolved = prop.status === "resolved";
              const isSaving = savingPropId === prop.id;
              const isCorrect = isResolved && userPick === prop.correctAnswer;

              return (
                <div
                  key={prop.id}
                  className={`rounded-xl border p-4 transition ${
                    isResolved
                      ? isCorrect
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/20 bg-red-500/5"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{prop.question}</p>
                      {isResolved && (
                        <p className="mt-1 text-xs text-white/40">
                          {isCorrect ? "Correct!" : "Incorrect"}{" "}
                          {isCorrect && `(+${prop.points} pts)`}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--lions-blue)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--lions-blue)]">
                      {prop.points} pts
                    </span>
                  </div>

                  <div className="mt-3">
                    {prop.type === "over_under" && (
                      <OverUnderInput
                        prop={prop}
                        userPick={userPick}
                        disabled={isLocked || isResolved}
                        saving={isSaving}
                        onSubmit={(answer) => handleSubmit(prop.id, answer)}
                      />
                    )}
                    {prop.type === "yes_no" && (
                      <YesNoInput
                        userPick={userPick}
                        disabled={isLocked || isResolved}
                        saving={isSaving}
                        onSubmit={(answer) => handleSubmit(prop.id, answer)}
                      />
                    )}
                    {prop.type === "pick_player" && (
                      <PlayerPickInput
                        players={players}
                        userPick={userPick}
                        disabled={isLocked || isResolved}
                        saving={isSaving}
                        search={playerSearch[prop.id] || ""}
                        onSearchChange={(v) => setPlayerSearch((prev) => ({ ...prev, [prop.id]: v }))}
                        onSubmit={(answer) => handleSubmit(prop.id, answer)}
                      />
                    )}
                    {prop.type === "pick_team" && (
                      <TeamPickInput
                        teams={teams}
                        userPick={userPick}
                        disabled={isLocked || isResolved}
                        saving={isSaving}
                        onSubmit={(answer) => handleSubmit(prop.id, answer)}
                      />
                    )}
                    {prop.type === "pick_number" && (
                      <PickNumberInput
                        userPick={userPick}
                        disabled={isLocked || isResolved}
                        saving={isSaving}
                        onSubmit={(answer) => handleSubmit(prop.id, answer)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Input Components ──────────────────────────────

function OverUnderInput({
  prop,
  userPick,
  disabled,
  saving,
  onSubmit,
}: {
  prop: Prop;
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onSubmit: (answer: string) => void;
}) {
  const opts = prop.options as { line: number } | null;
  const line = opts?.line ?? 0;
  return (
    <div className="flex gap-2">
      {["over", "under"].map((choice) => (
        <button
          key={choice}
          onClick={() => !disabled && onSubmit(choice)}
          disabled={disabled || saving}
          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
            userPick === choice
              ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/20 text-[var(--lions-blue)]"
              : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
          } disabled:opacity-50`}
        >
          {choice === "over" ? `Over ${line}` : `Under ${line}`}
        </button>
      ))}
    </div>
  );
}

function YesNoInput({
  userPick,
  disabled,
  saving,
  onSubmit,
}: {
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onSubmit: (answer: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {["yes", "no"].map((choice) => (
        <button
          key={choice}
          onClick={() => !disabled && onSubmit(choice)}
          disabled={disabled || saving}
          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
            userPick === choice
              ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/20 text-[var(--lions-blue)]"
              : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
          } disabled:opacity-50`}
        >
          {choice === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function PlayerPickInput({
  players,
  userPick,
  disabled,
  saving,
  search,
  onSearchChange,
  onSubmit,
}: {
  players: Player[];
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onSubmit: (answer: string) => void;
}) {
  const selectedPlayer = userPick ? players.find((p) => p.id === userPick) : null;
  const filtered = search.trim()
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.position.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  if (disabled && selectedPlayer) {
    return (
      <div className="rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-3 py-2 text-sm text-[var(--lions-blue)]">
        {selectedPlayer.name} ({selectedPlayer.position}, {selectedPlayer.school})
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedPlayer && (
        <div className="rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-3 py-2 text-sm text-[var(--lions-blue)] flex items-center justify-between">
          <span>{selectedPlayer.name} ({selectedPlayer.position})</span>
          {!disabled && (
            <button onClick={() => onSearchChange("")} className="text-xs text-white/40 hover:text-white/60">
              Change
            </button>
          )}
        </div>
      )}
      {!disabled && (
        <>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none"
          />
          {filtered.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-[#0c1322] max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSubmit(p.id); onSearchChange(""); }}
                  disabled={saving}
                  className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 transition flex items-center gap-2"
                >
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="text-xs text-[var(--lions-blue)]">{p.position}</span>
                  <span className="text-xs text-white/30">{p.school}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeamPickInput({
  teams,
  userPick,
  disabled,
  saving,
  onSubmit,
}: {
  teams: Team[];
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onSubmit: (answer: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {teams.map((t) => (
        <button
          key={t.id}
          onClick={() => !disabled && onSubmit(t.id)}
          disabled={disabled || saving}
          className={`rounded-lg border p-2 text-center transition ${
            userPick === t.id
              ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/20"
              : "border-white/10 bg-white/5 hover:border-white/20"
          } disabled:opacity-50`}
          title={t.name}
        >
          {t.logoUrl ? (
            <Image src={t.logoUrl} alt={t.abbreviation} width={24} height={24} className="mx-auto" />
          ) : (
            <span className="text-[10px] font-bold text-white/50">{t.abbreviation}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function PickNumberInput({
  userPick,
  disabled,
  saving,
  onSubmit,
}: {
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState(userPick || "");
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={32}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Pick #"
        className="w-24 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--lions-blue)] focus:outline-none disabled:opacity-50"
      />
      {!disabled && (
        <button
          onClick={() => value && onSubmit(value)}
          disabled={saving || !value}
          className="rounded-lg bg-[var(--lions-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lions-blue)]/80 transition disabled:opacity-50"
        >
          {userPick ? "Update" : "Lock In"}
        </button>
      )}
      {userPick && (
        <span className="text-xs text-[var(--lions-blue)]">Pick #{userPick}</span>
      )}
    </div>
  );
}
