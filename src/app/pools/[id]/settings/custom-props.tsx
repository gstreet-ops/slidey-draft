"use client";

import { useState, useTransition } from "react";
import { createCustomProp, deleteCustomProp, resolveCustomProp } from "@/lib/actions";
import { useRouter } from "next/navigation";

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

const TYPE_OPTIONS = [
  { value: "yes_no", label: "Yes / No" },
  { value: "over_under", label: "Over / Under" },
  { value: "pick_player", label: "Pick a Player" },
  { value: "pick_team", label: "Pick a Team" },
  { value: "pick_number", label: "Pick a Number" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-500/20 text-green-400",
  locked: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-white/10 text-white/50",
};

export function CustomProps({
  poolId,
  existingCustomProps,
}: {
  poolId: string;
  existingCustomProps: Prop[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [type, setType] = useState("yes_no");
  const [points, setPoints] = useState(5);
  const [category, setCategory] = useState("Custom");
  const [ouLine, setOuLine] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Resolve state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");

  function handleCreate() {
    if (!question.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const options = type === "over_under" && ouLine ? { line: parseFloat(ouLine) } : undefined;
        await createCustomProp(poolId, { question, type, options, points, category });
        setQuestion("");
        setType("yes_no");
        setPoints(5);
        setCategory("Custom");
        setOuLine("");
        setShowForm(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create");
      }
    });
  }

  function handleDelete(propId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteCustomProp(propId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  function handleResolve(propId: string) {
    if (!resolveAnswer.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await resolveCustomProp(propId, resolveAnswer);
        setResolvingId(null);
        setResolveAnswer("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to resolve");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/8 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Custom Prop Bets</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-[var(--steelers-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition"
        >
          {showForm ? "Cancel" : "+ Create Prop"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will Dan yell at the TV during the first pick?"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--steelers-gold)] focus:outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--steelers-gold)] focus:outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[var(--surface-dark)]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1">Points</label>
              <input
                type="number"
                min={1}
                max={20}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--steelers-gold)] focus:outline-none"
              />
            </div>
          </div>

          {type === "over_under" && (
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1">Over/Under Line</label>
              <input
                type="number"
                step="0.5"
                value={ouLine}
                onChange={(e) => setOuLine(e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--steelers-gold)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Custom"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--steelers-gold)] focus:outline-none"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || !question.trim()}
            className="w-full rounded-lg bg-[var(--steelers-gold)] py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--steelers-gold)]/80 transition disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Prop"}
          </button>
        </div>
      )}

      {/* Existing custom props */}
      {existingCustomProps.length > 0 ? (
        <div className="space-y-2">
          {existingCustomProps.map((prop) => (
            <div
              key={prop.id}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{prop.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[prop.status] || "bg-white/10 text-white/50"}`}>
                      {prop.status}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {TYPE_OPTIONS.find((t) => t.value === prop.type)?.label} · {prop.points} pts · {prop.category}
                    </span>
                  </div>
                  {prop.correctAnswer && (
                    <p className="text-xs text-green-400/70 mt-1">Answer: {prop.correctAnswer}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {prop.status !== "resolved" && (
                    <button
                      onClick={() => { setResolvingId(resolvingId === prop.id ? null : prop.id); setResolveAnswer(""); }}
                      className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-400 hover:bg-green-500/20 transition"
                    >
                      Resolve
                    </button>
                  )}
                  {prop.status === "open" && (
                    <button
                      onClick={() => handleDelete(prop.id)}
                      disabled={isPending}
                      className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Resolve form */}
              {resolvingId === prop.id && (
                <div className="mt-3 flex items-center gap-2">
                  {prop.type === "yes_no" ? (
                    <>
                      <button
                        onClick={() => { setResolveAnswer("yes"); }}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${resolveAnswer === "yes" ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]" : "border-white/10 text-white/50"}`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => { setResolveAnswer("no"); }}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${resolveAnswer === "no" ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]" : "border-white/10 text-white/50"}`}
                      >
                        No
                      </button>
                    </>
                  ) : prop.type === "over_under" ? (
                    <>
                      <button
                        onClick={() => { setResolveAnswer("over"); }}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${resolveAnswer === "over" ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]" : "border-white/10 text-white/50"}`}
                      >
                        Over
                      </button>
                      <button
                        onClick={() => { setResolveAnswer("under"); }}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${resolveAnswer === "under" ? "border-[var(--steelers-gold)] bg-[var(--steelers-gold)]/20 text-[var(--steelers-gold)]" : "border-white/10 text-white/50"}`}
                      >
                        Under
                      </button>
                    </>
                  ) : (
                    <input
                      type="text"
                      value={resolveAnswer}
                      onChange={(e) => setResolveAnswer(e.target.value)}
                      placeholder="Correct answer..."
                      className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[var(--steelers-gold)] focus:outline-none"
                    />
                  )}
                  <button
                    onClick={() => handleResolve(prop.id)}
                    disabled={isPending || !resolveAnswer.trim()}
                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500 transition disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <p className="text-xs text-white/40">No custom props yet. Create fun pool-specific predictions for your group.</p>
      ) : null}
    </div>
  );
}
