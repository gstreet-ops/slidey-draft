"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Question = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  category: string;
  difficulty: string;
};

type Result = {
  correct: boolean;
  correctOption: string;
  pointsAwarded: number;
};

const TIMER_SECONDS = 15;

export function TriviaCard({ poolId }: { poolId: string }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [triviaScore, setTriviaScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const questionRef = useRef<Question | null>(null);

  const handleTimeout = useCallback(() => {
    // Time's up — no points, show result as timeout
    setResult({ correct: false, correctOption: "", pointsAwarded: 0 });
    setSelected(null);
  }, []);

  // Start countdown when a new question loads
  useEffect(() => {
    if (!question || result) return;
    questionRef.current = question;
    setTimeLeft(TIMER_SECONDS);

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

  async function fetchQuestion() {
    setLoading(true);
    setResult(null);
    setSelected(null);
    setTimeLeft(TIMER_SECONDS);
    const res = await fetch(`/api/pools/${poolId}/trivia`);
    const data = await res.json();
    if (data.noMoreQuestions) {
      setDone(true);
      setQuestion(null);
    } else {
      setQuestion(data);
    }
    setLoading(false);
  }

  async function submitAnswer(option: string) {
    if (!question || submitting || result) return;
    clearInterval(timerRef.current);
    setSelected(option);
    setSubmitting(true);

    const res = await fetch(`/api/pools/${poolId}/trivia/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, selectedOption: option }),
    });
    const data = await res.json();
    setResult(data);
    if (data.pointsAwarded > 0) {
      setTriviaScore((prev) => prev + data.pointsAwarded);
    }
    setSubmitting(false);
  }

  // Not started yet
  if (!question && !done) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Draft Trivia</h3>
            <p className="text-xs text-white/30 mt-0.5">15 seconds per question — 5pts each</p>
          </div>
          <button
            onClick={fetchQuestion}
            disabled={loading}
            className="rounded-lg bg-[var(--slidey)] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Start Trivia"}
          </button>
        </div>
      </div>
    );
  }

  // All done
  if (done) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-white/60 text-sm">All trivia complete!</p>
        <p className="text-white font-bold mt-1">Trivia Score: {triviaScore}pts</p>
      </div>
    );
  }

  // Active question
  const options = [
    { key: "a", label: "A", text: question!.optionA },
    { key: "b", label: "B", text: question!.optionB },
    { key: "c", label: "C", text: question!.optionC },
    { key: "d", label: "D", text: question!.optionD },
  ];

  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-[var(--slidey)]";
  const isTimedOut = result && !selected;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">
          {question!.category.replace("_", " ")} · {question!.difficulty}
        </span>
        <div className="flex items-center gap-2">
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
            if (opt.key === result.correctOption) {
              style = "border-green-500/50 bg-green-500/20 text-green-300";
            } else if (opt.key === selected && !result.correct) {
              style = "border-red-500/50 bg-red-500/20 text-red-300";
            } else {
              style = "border-white/5 bg-white/[0.02] text-white/30";
            }
          } else if (opt.key === selected) {
            style = "border-[var(--slidey)]/50 bg-[var(--slidey)]/20 text-white";
          }

          return (
            <button
              key={opt.key}
              onClick={() => submitAnswer(opt.key)}
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
        <div className="flex items-center justify-between pt-1">
          <span
            className={`text-sm font-bold ${result.correct ? "text-green-400" : "text-red-400"}`}
          >
            {isTimedOut ? "Time's up!" : result.correct ? `Correct! +${result.pointsAwarded}pts` : "Wrong!"}
          </span>
          <button
            onClick={fetchQuestion}
            disabled={loading}
            className="text-sm text-[var(--slidey)] font-semibold hover:opacity-80 transition"
          >
            Next Question →
          </button>
        </div>
      )}
    </div>
  );
}
