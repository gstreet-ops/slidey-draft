"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type RoundInfo = {
  id: string;
  label: string | null;
  progress: string;
  currentQuestionIndex: number;
  questionCount: number;
  isLightning: boolean;
  pointMultiplier: number;
  status: "pending" | "active" | "paused" | "completed";
};

type Question = {
  id: string;
  question: string;
  options: string[];
  category: string;
  difficulty: string;
  sortOrder?: number;
  totalQueued?: number;
  timerSeconds?: number;
  expiresAt?: number;
  paused?: boolean;
  live?: boolean;
  basePoints?: number;
  pointMultiplier?: number;
  displayPoints?: number;
  round?: RoundInfo | null;
};

type Result = {
  correct: boolean;
  correctAnswer: number;
  pointsAwarded: number;
  pointMultiplier?: number;
};

const CATEGORY_EMOJI: Record<string, string> = {
  nfl_history: "\u{1F3C8}",
  draft_trivia: "\u{1F4CB}",
  team_trivia: "\u{1F3C6}",
  prospects: "\u{1F3C3}",
  sports_general: "\u{26BD}",
  pop_culture: "\u{1F3AC}",
  general_knowledge: "\u{1F4A1}",
};

const POLL_INTERVAL = 5000;
const DEFAULT_TIMER = 30;

export function TriviaCard({ poolId }: { poolId: string }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [triviaScore, setTriviaScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER);
  const [timerTotal, setTimerTotal] = useState(DEFAULT_TIMER);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const questionRef = useRef<Question | null>(null);
  const lastQuestionId = useRef<string | null>(null);

  const handleTimeout = useCallback(async () => {
    const q = questionRef.current;
    if (q) {
      try {
        const res = await fetch(`/api/pools/${poolId}/trivia/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, selectedAnswer: -1 }),
        });
        const data = await res.json();
        setResult({ correct: false, correctAnswer: data.correctAnswer ?? -1, pointsAwarded: 0 });
      } catch {
        setResult({ correct: false, correctAnswer: -1, pointsAwarded: 0 });
      }
    } else {
      setResult({ correct: false, correctAnswer: -1, pointsAwarded: 0 });
    }
    setSelected(null);
  }, [poolId]);

  // Start countdown when a new question loads (skip if timer is 0 / no timer)
  useEffect(() => {
    if (!question || result) return;
    questionRef.current = question;
    const t = question.timerSeconds ?? DEFAULT_TIMER;

    // No timer mode: question stays live until manually advanced
    if (t === 0) {
      setTimerTotal(0);
      setTimeLeft(0);
      return;
    }

    let remaining = t;
    if (question.expiresAt) {
      remaining = Math.max(1, Math.ceil((question.expiresAt - Date.now()) / 1000));
    }

    setTimerTotal(t);
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      // Don't count down if paused
      setPaused((currentPaused) => {
        if (currentPaused) return currentPaused;
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
        return currentPaused;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [question, result, handleTimeout]);

  // Poll for live questions every 5 seconds
  useEffect(() => {
    async function pollForQuestion() {
      try {
        const res = await fetch(`/api/pools/${poolId}/trivia`);
        const data = await res.json();
        if (data.noActiveQuestion) return;
        if (data.alreadyAnswered) return;
        // Update paused state from server on every poll
        if (data.paused !== undefined) setPaused(!!data.paused);

        if (data.live && data.id !== lastQuestionId.current) {
          lastQuestionId.current = data.id;
          setQuestion(data);
          setResult(null);
          setSelected(null);
          setDone(false);
        }
      } catch {
        // ignore polling errors
      }
    }

    pollForQuestion();
    pollRef.current = setInterval(pollForQuestion, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [poolId]);

  async function submitAnswer(answerIndex: number) {
    if (!question || submitting || result) return;
    clearInterval(timerRef.current);
    setSelected(answerIndex);
    setSubmitting(true);

    const res = await fetch(`/api/pools/${poolId}/trivia/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, selectedAnswer: answerIndex }),
    });
    const data = await res.json();
    setResult(data);
    if (data.pointsAwarded > 0) {
      setTriviaScore((prev) => prev + data.pointsAwarded);
    }
    setSubmitting(false);
  }

  // No active question
  if (!question && !done) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Draft Trivia</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Questions fire automatically during the draft</p>
          </div>
          {triviaScore > 0 && (
            <span className="text-sm text-[var(--slidey)] font-bold">{triviaScore}pts</span>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
        <p className="text-[var(--text-secondary)] text-sm">No more trivia questions</p>
        <p className="text-[var(--text-primary)] font-bold mt-1">Trivia Score: {triviaScore}pts</p>
      </div>
    );
  }

  const options = (question!.options as string[]).map((text, i) => ({
    index: i,
    label: String.fromCharCode(65 + i), // A, B, C, D
    text,
  }));

  const categoryEmoji = CATEGORY_EMOJI[question!.category] || "\u{2753}";
  const categoryLabel = question!.category.replace(/_/g, " ");
  const timerPct = (timeLeft / timerTotal) * 100;
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-[var(--slidey)]";
  const isTimedOut = result && selected === null;
  const round = question!.round || null;
  const isLightning = !!round?.isLightning;
  const multiplier = round?.pointMultiplier ?? question!.pointMultiplier ?? 1;
  const basePoints = question!.basePoints ?? 0;
  const displayPoints = question!.displayPoints ?? basePoints * multiplier;
  const roundProgress = round?.progress
    || (question!.sortOrder && question!.totalQueued ? `Q${question!.sortOrder} of ${question!.totalQueued}` : null);

  const cardBase = "relative rounded-xl border p-4 space-y-3 transition";
  const cardSkin = isLightning
    ? "border-amber-300 bg-amber-50/60"
    : "border-[var(--border)] bg-[var(--bg-card)]";
  const lightningStyle: React.CSSProperties | undefined =
    isLightning && !paused && !result
      ? { animation: "lightning-border 1.2s ease-in-out infinite" }
      : undefined;

  return (
    <div className={`${cardBase} ${cardSkin}`} style={lightningStyle}>
      {/* Round label header */}
      {round?.label && (
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.18em] ${isLightning ? "text-amber-700" : "text-[var(--slidey)]"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {isLightning ? `⚡ ${round.label}` : round.label}
          </span>
          {isLightning && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {multiplier}× POINTS
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
            {categoryEmoji} {categoryLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            question!.difficulty === "easy" ? "bg-green-100 text-green-700" :
            question!.difficulty === "hard" ? "bg-red-100 text-red-700" :
            "bg-yellow-100 text-yellow-700"
          }`}>
            {question!.difficulty}
          </span>
          {question!.live && !paused && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">LIVE</span>
          )}
          {isLightning && !round?.label && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">⚡ {multiplier}×</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {roundProgress && (
            <span className="text-[10px] text-[var(--text-muted)]">{roundProgress}</span>
          )}
          {triviaScore > 0 && (
            <span className="text-xs text-[var(--slidey)] font-bold">{triviaScore}pts</span>
          )}
          {!result && timerTotal > 0 && !paused && (
            <span className={`text-sm font-bold tabular-nums ${timeLeft <= 5 ? "text-red-700" : isLightning ? "text-amber-700" : "text-[var(--text-secondary)]"}`}>
              {timeLeft}s
            </span>
          )}
          {!result && paused && (
            <span className="text-[10px] font-bold text-yellow-700 animate-pulse">PAUSED</span>
          )}
          {!result && timerTotal === 0 && !paused && (
            <span className="text-[10px] text-[var(--text-muted)]">No timer</span>
          )}
        </div>
      </div>

      {/* Timer bar */}
      {!result && timerTotal > 0 && (
        <div className="h-1 rounded-full bg-[var(--bg-card)] overflow-hidden">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}

      <p className="text-sm font-semibold text-[var(--text-primary)]">{question!.question}</p>

      {displayPoints > 0 && !result && (
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Answer correctly:{" "}
          <span className={isLightning ? "text-amber-700" : "text-[var(--slidey)]"}>
            {isLightning ? `⚡ +${displayPoints} pts` : `+${displayPoints} pts`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          let style = "border-[var(--border)] bg-[var(--bg-card)] hover:bg-gray-50 text-[var(--text-primary)]";

          if (result) {
            if (opt.index === result.correctAnswer) {
              style = "border-green-200 bg-green-100 text-green-700";
            } else if (opt.index === selected && !result.correct) {
              style = "border-red-200 bg-red-100 text-red-700";
            } else {
              style = "border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-muted)]";
            }
          } else if (opt.index === selected) {
            style = "border-[var(--slidey)]/50 bg-[var(--slidey)]/20 text-[var(--text-primary)]";
          }

          return (
            <button
              key={opt.index}
              onClick={() => submitAnswer(opt.index)}
              disabled={!!result || submitting || paused}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${style} ${paused ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="text-xs font-bold opacity-60 w-4">{opt.label}</span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      {result && (
        <div className="pt-1">
          <span
            className={`text-sm font-bold ${result.correct ? (isLightning ? "text-amber-700" : "text-green-700") : "text-red-700"}`}
          >
            {isTimedOut
              ? "Time's up!"
              : result.correct
                ? isLightning && (result.pointMultiplier ?? multiplier) > 1
                  ? `⚡ Correct! +${result.pointsAwarded}pts`
                  : `Correct! +${result.pointsAwarded}pts`
                : "Wrong!"}
          </span>
        </div>
      )}

      {/* Paused overlay */}
      {paused && !result && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/70 backdrop-blur-sm">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300 animate-pulse">Paused</span>
          <span className="mt-1 text-xs text-white/80">Waiting for commissioner to resume...</span>
        </div>
      )}
    </div>
  );
}
