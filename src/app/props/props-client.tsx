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
  position: { label: "POSITION PROPS", emoji: "\uD83C\uDFC8", color: "text-emerald-700", border: "border-emerald-200", cardBorder: "border-emerald-200", cardBg: "bg-emerald-500/[0.03]" },
  trade: { label: "TRADE PROPS", emoji: "\uD83D\uDD04", color: "text-amber-700", border: "border-amber-200", cardBorder: "border-amber-200", cardBg: "bg-amber-500/[0.03]" },
  fun: { label: "FUN PROPS", emoji: "\uD83C\uDF89", color: "text-pink-700", border: "border-pink-200", cardBorder: "border-pink-200", cardBg: "bg-pink-500/[0.03]" },
  general: { label: "GENERAL", emoji: "", color: "text-sky-700", border: "border-sky-200", cardBorder: "border-[var(--border)]", cardBg: "bg-[var(--bg-card)]" },
  team: { label: "TEAM PROPS", emoji: "\uD83D\uDEE1\uFE0F", color: "text-orange-700", border: "border-orange-200", cardBorder: "border-orange-200", cardBg: "bg-orange-500/[0.03]" },
};

const CATEGORY_ORDER = ["position", "trade", "fun", "general", "team"];

function pointsBadgeClass(pts: number): string {
  if (pts >= 10) return "bg-emerald-100 text-emerald-700 font-bold";
  if (pts >= 7) return "bg-amber-100 text-amber-700";
  if (pts >= 5) return "bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]";
  return "bg-[var(--bg-card)] text-[var(--text-muted)]";
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
                    ? "border-green-200 bg-green-500/5"
                    : "border-red-200 bg-red-500/5"
                  : `${style.cardBorder} ${style.cardBg} ${isOpen ? "hover:border-[var(--border)] hover:bg-gray-50" : ""}`;

                return (
                  <div
                    key={prop.id}
                    className={`rounded-xl border p-4 transition-all duration-200 ${cardClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{prop.question}</p>
                        {isResolved && (
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
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
              ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]"
              : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
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
              ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]"
              : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
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
      <div className="rounded-lg border border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10 px-3 py-2 text-sm text-[var(--steelers-gold)] ring-1 ring-[var(--steelers-gold)]/30">
        ✓ {selectedPlayer.name} ({selectedPlayer.position}, {selectedPlayer.school})
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedPlayer && (
        <div className="rounded-lg border border-[var(--steelers-gold)]/30 bg-[var(--steelers-gold)]/10 px-3 py-2 text-sm text-[var(--steelers-gold)] flex items-center justify-between ring-1 ring-[var(--steelers-gold)]/30">
          <span>✓ {selectedPlayer.name} ({selectedPlayer.position})</span>
          <div className="flex gap-2">
            <button onClick={() => onSearchChange("")} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              Change
            </button>
            <button onClick={onClear} className="text-xs text-red-700/60 hover:text-red-700">
              ✗
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
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--steelers-gold)] focus:outline-none"
          />
          {filtered.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-white max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSubmit(p.id);
                    onSearchChange("");
                  }}
                  disabled={saving}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <span className="font-semibold text-[var(--text-primary)]">{p.name}</span>
                  <span className="text-xs text-[var(--steelers-gold)]">{p.position}</span>
                  <span className="text-xs text-[var(--text-muted)]">{p.school}</span>
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
              ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 ring-2 ring-[var(--steelers-gold)]/40 scale-105"
              : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border)]"
          } disabled:opacity-50`}
          title={t.name}
        >
          {t.logoUrl ? (
            <Image src={t.logoUrl} alt={t.abbreviation} width={24} height={24} className="mx-auto" />
          ) : (
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{t.abbreviation}</span>
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
        className="w-24 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--steelers-gold)] focus:outline-none disabled:opacity-50"
      />
      {!disabled && (
        <button
          onClick={() => value && onSubmit(value)}
          disabled={saving || !value}
          className="rounded-lg bg-[var(--steelers-gold)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition disabled:opacity-50"
        >
          {userPick ? "Update" : "Lock In"}
        </button>
      )}
      {userPick && !disabled && (
        <button
          onClick={onClear}
          disabled={saving}
          className="text-xs text-red-700/60 hover:text-red-700 transition disabled:opacity-50"
        >
          Clear
        </button>
      )}
      {userPick && (
        <span className="rounded-full bg-[var(--steelers-gold)]/20 px-2.5 py-1 text-xs font-bold text-[var(--steelers-gold)]">
          #{userPick}
        </span>
      )}
    </div>
  );
}
