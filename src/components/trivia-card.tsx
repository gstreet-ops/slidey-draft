"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  live?: boolean;
};

type Result = {
  correct: boolean;
  correctAnswer: number;
  pointsAwarded: number;
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

  // Start countdown when a new question loads
  useEffect(() => {
    if (!question || result) return;
    questionRef.current = question;
    const t = question.timerSeconds ?? DEFAULT_TIMER;

    let remaining = t;
    if (question.expiresAt) {
      remaining = Math.max(1, Math.ceil((question.expiresAt - Date.now()) / 1000));
    }

    setTimerTotal(t);
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Draft Trivia</h3>
            <p className="text-xs text-white/30 mt-0.5">Questions fire automatically during the draft</p>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-white/60 text-sm">No more trivia questions</p>
        <p className="text-white font-bold mt-1">Trivia Score: {triviaScore}pts</p>
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

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
            {categoryEmoji} {categoryLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            question!.difficulty === "easy" ? "bg-green-500/20 text-green-400" :
            question!.difficulty === "hard" ? "bg-red-500/20 text-red-400" :
            "bg-yellow-500/20 text-yellow-400"
          }`}>
            {question!.difficulty}
          </span>
          {question!.live && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 animate-pulse">LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {question!.sortOrder && question!.totalQueued && (
            <span className="text-[10px] text-white/30">Q{question!.sortOrder} of {question!.totalQueued}</span>
          )}
          {triviaScore > 0 && (
            <span className="text-xs text-[var(--slidey)] font-bold">{triviaScore}pts</span>
          )}
          {!result && (
            <span className={`text-sm font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400" : "text-white/60"}`}>
              {timeLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Timer bar */}
      {!result && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}

      <p className="text-sm font-semibold text-white">{question!.question}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          let style = "border-white/10 bg-white/5 hover:bg-white/10 text-white/80";

          if (result) {
            if (opt.index === result.correctAnswer) {
              style = "border-green-500/50 bg-green-500/20 text-green-300";
            } else if (opt.index === selected && !result.correct) {
              style = "border-red-500/50 bg-red-500/20 text-red-300";
            } else {
              style = "border-white/5 bg-white/[0.02] text-white/30";
            }
          } else if (opt.index === selected) {
            style = "border-[var(--slidey)]/50 bg-[var(--slidey)]/20 text-white";
          }

          return (
            <button
              key={opt.index}
              onClick={() => submitAnswer(opt.index)}
              disabled={!!result || submitting}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${style}`}
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
            className={`text-sm font-bold ${result.correct ? "text-green-400" : "text-red-400"}`}
          >
            {isTimedOut ? "Time's up!" : result.correct ? `Correct! +${result.pointsAwarded}pts` : "Wrong!"}
          </span>
        </div>
      )}
    </div>
  );
}
