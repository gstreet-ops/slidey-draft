"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { submitPropPick, clearPropPick } from "@/lib/actions";

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

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string; border: string; cardBorder: string; cardBg: string }> = {
  position: { label: "POSITION PROPS", emoji: "\uD83C\uDFC8", color: "text-emerald-400", border: "border-emerald-500/30", cardBorder: "border-emerald-500/15", cardBg: "bg-emerald-500/[0.03]" },
  trade: { label: "TRADE PROPS", emoji: "\uD83D\uDD04", color: "text-amber-400", border: "border-amber-500/30", cardBorder: "border-amber-500/15", cardBg: "bg-amber-500/[0.03]" },
  fun: { label: "FUN PROPS", emoji: "\uD83C\uDF89", color: "text-pink-400", border: "border-pink-500/30", cardBorder: "border-pink-500/15", cardBg: "bg-pink-500/[0.03]" },
  general: { label: "GENERAL", emoji: "", color: "text-sky-400", border: "border-sky-500/30", cardBorder: "border-white/10", cardBg: "bg-white/5" },
  team: { label: "TEAM PROPS", emoji: "\uD83D\uDEE1\uFE0F", color: "text-orange-400", border: "border-orange-500/30", cardBorder: "border-orange-500/15", cardBg: "bg-orange-500/[0.03]" },
};

const CATEGORY_ORDER = ["position", "trade", "fun", "general", "team"];

function pointsBadgeClass(pts: number): string {
  if (pts >= 10) return "bg-emerald-500/20 text-emerald-400 font-bold";
  if (pts >= 7) return "bg-amber-500/20 text-amber-400";
  if (pts >= 5) return "bg-[var(--lions-blue)]/20 text-[var(--lions-blue)]";
  return "bg-white/10 text-white/50";
}

function getCatStyle(cat: string) {
  return CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
}

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
        setPickMap((prev) => { const next = { ...prev }; delete next[propId]; return next; });
      } finally {
        setSavingPropId(null);
      }
    });
  }

  function handleClear(propId: string) {
    setSavingPropId(propId);
    const oldAnswer = pickMap[propId];
    setPickMap((prev) => { const next = { ...prev }; delete next[propId]; return next; });
    startTransition(async () => {
      try {
        await clearPropPick(propId, poolId);
      } catch (err) {
        console.error("clearPropPick failed:", err);
        if (oldAnswer) setPickMap((prev) => ({ ...prev, [propId]: oldAnswer }));
      } finally {
        setSavingPropId(null);
      }
    });
  }

  function handleToggle(propId: string, answer: string) {
    if (pickMap[propId] === answer) {
      handleClear(propId);
    } else {
      handleSubmit(propId, answer);
    }
  }

  const grouped = new Map<string, Prop[]>();
  for (const prop of props) {
    const cat = prop.category || "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(prop);
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));
  for (const cat of grouped.keys()) {
    if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
  }

  return (
    <div className="space-y-8">
      {sortedCategories.map((cat) => {
        const style = getCatStyle(cat);
        return (
          <div key={cat} className={`border-l-2 pl-4 ${style.border}`}>
            <h2
              className={`text-sm font-bold uppercase tracking-wider mb-3 ${style.color}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {style.emoji && <span className="mr-1.5">{style.emoji}</span>}
              {style.label}
            </h2>
            <div className="space-y-3">
              {grouped.get(cat)!.map((prop) => {
                const userPick = pickMap[prop.id];
                const isLocked = prop.status === "locked";
                const isResolved = prop.status === "resolved";
                const isSaving = savingPropId === prop.id;
                const isCorrect = isResolved && userPick === prop.correctAnswer;
                const isOpen = prop.status === "open";

                const cardClass = isResolved
                  ? isCorrect
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/20 bg-red-500/5"
                  : `${style.cardBorder} ${style.cardBg} ${isOpen ? "hover:border-white/20 hover:bg-white/[0.06]" : ""}`;

                return (
                  <div
                    key={prop.id}
                    className={`rounded-xl border p-4 transition-all duration-200 ${cardClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{prop.question}</p>
                        {isResolved && (
                          <p className="mt-1 text-xs text-white/40">
                            {isCorrect ? "\u2713 Correct!" : "\u2717 Incorrect"}{" "}
                            {isCorrect && `(+${prop.points} pts)`}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${pointsBadgeClass(prop.points)}`}>
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
                          onToggle={(answer) => handleToggle(prop.id, answer)}
                        />
                      )}
                      {prop.type === "yes_no" && (
                        <YesNoInput
                          userPick={userPick}
                          disabled={isLocked || isResolved}
                          saving={isSaving}
                          onToggle={(answer) => handleToggle(prop.id, answer)}
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
                          onClear={() => handleClear(prop.id)}
                        />
                      )}
                      {prop.type === "pick_team" && (
                        <TeamPickInput
                          teams={teams}
                          userPick={userPick}
                          disabled={isLocked || isResolved}
                          saving={isSaving}
                          onToggle={(answer) => handleToggle(prop.id, answer)}
                        />
                      )}
                      {prop.type === "pick_number" && (
                        <PickNumberInput
                          userPick={userPick}
                          disabled={isLocked || isResolved}
                          saving={isSaving}
                          onSubmit={(answer) => handleSubmit(prop.id, answer)}
                          onClear={() => handleClear(prop.id)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Input Components ──────────────────────────────

function OverUnderInput({
  prop,
  userPick,
  disabled,
  saving,
  onToggle,
}: {
  prop: Prop;
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onToggle: (answer: string) => void;
}) {
  const opts = prop.options as { line: number } | null;
  const line = opts?.line ?? 0;
  return (
    <div className="flex gap-2">
      {["over", "under"].map((choice) => (
        <button
          key={choice}
          onClick={() => !disabled && onToggle(choice)}
          disabled={disabled || saving}
          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
            userPick === choice
              ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/20 text-[var(--lions-blue)]"
              : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
          } disabled:opacity-50`}
        >
          {userPick === choice && "\u2713 "}
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
  onToggle,
}: {
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onToggle: (answer: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {["yes", "no"].map((choice) => (
        <button
          key={choice}
          onClick={() => !disabled && onToggle(choice)}
          disabled={disabled || saving}
          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
            userPick === choice
              ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/20 text-[var(--lions-blue)]"
              : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
          } disabled:opacity-50`}
        >
          {userPick === choice && "\u2713 "}
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
  onClear,
}: {
  players: Player[];
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onSubmit: (answer: string) => void;
  onClear: () => void;
}) {
  const selectedPlayer = userPick ? players.find((p) => p.id === userPick) : null;
  const filtered = search.trim()
    ? players
        .filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.position.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 8)
    : [];

  if (disabled && selectedPlayer) {
    return (
      <div className="rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-3 py-2 text-sm text-[var(--lions-blue)] ring-1 ring-[var(--lions-blue)]/30">
        \u2713 {selectedPlayer.name} ({selectedPlayer.position}, {selectedPlayer.school})
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedPlayer && (
        <div className="rounded-lg border border-[var(--lions-blue)]/30 bg-[var(--lions-blue)]/10 px-3 py-2 text-sm text-[var(--lions-blue)] flex items-center justify-between ring-1 ring-[var(--lions-blue)]/30">
          <span>\u2713 {selectedPlayer.name} ({selectedPlayer.position})</span>
          <div className="flex gap-2">
            <button onClick={() => onSearchChange("")} className="text-xs text-white/40 hover:text-white/60">
              Change
            </button>
            <button onClick={onClear} className="text-xs text-red-400/60 hover:text-red-400">
              \u2717
            </button>
          </div>
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
                  onClick={() => {
                    onSubmit(p.id);
                    onSearchChange("");
                  }}
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
  onToggle,
}: {
  teams: Team[];
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onToggle: (answer: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {teams.map((t) => (
        <button
          key={t.id}
          onClick={() => !disabled && onToggle(t.id)}
          disabled={disabled || saving}
          className={`rounded-lg border p-2 text-center transition-all duration-150 ${
            userPick === t.id
              ? "border-[var(--lions-blue)] bg-[var(--lions-blue)]/20 ring-2 ring-[var(--lions-blue)]/40 scale-105"
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
  onClear,
}: {
  userPick?: string;
  disabled: boolean;
  saving: boolean;
  onSubmit: (answer: string) => void;
  onClear: () => void;
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
      {userPick && !disabled && (
        <button
          onClick={onClear}
          disabled={saving}
          className="text-xs text-red-400/60 hover:text-red-400 transition disabled:opacity-50"
        >
          Clear
        </button>
      )}
      {userPick && (
        <span className="rounded-full bg-[var(--lions-blue)]/20 px-2.5 py-1 text-xs font-bold text-[var(--lions-blue)]">
          #{userPick}
        </span>
      )}
    </div>
  );
}
