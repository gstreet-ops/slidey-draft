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
  timerSeconds?: number;
  expiresAt?: number;
  live?: boolean;
};

type Result = {
  correct: boolean;
  correctOption: string;
  pointsAwarded: number;
};

const POLL_INTERVAL = 5000; // Poll for live questions every 5s
const DEFAULT_TIMER = 30;

export function TriviaCard({ poolId }: { poolId: string }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
        const res = await fetch(`/api/pools/${poolId}/trivia/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, selectedOption: "__timeout__" }),
        });
        const data = await res.json();
        setResult({ correct: false, correctOption: data.correctOption || "", pointsAwarded: 0 });
      } catch {
        setResult({ correct: false, correctOption: "", pointsAwarded: 0 });
      }
    } else {
      setResult({ correct: false, correctOption: "", pointsAwarded: 0 });
    }
    setSelected(null);
  }, [poolId]);

  // Start countdown when a new question loads
  useEffect(() => {
    if (!question || result) return;
    questionRef.current = question;
    const t = question.timerSeconds ?? DEFAULT_TIMER;

    // If the question has an expiresAt, calculate remaining time
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
        if (data.noMoreQuestions) return;
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

    pollRef.current = setInterval(pollForQuestion, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [poolId]);

  async function fetchQuestion() {
    setLoading(true);
    setResult(null);
    setSelected(null);
    const res = await fetch(`/api/pools/${poolId}/trivia`);
    const data = await res.json();
    if (data.noMoreQuestions) {
      setDone(true);
      setQuestion(null);
    } else {
      lastQuestionId.current = data.id;
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
            <p className="text-xs text-white/30 mt-0.5">Questions fire automatically during the draft — or start now</p>
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

  const timerPct = (timeLeft / timerTotal) * 100;
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-[var(--slidey)]";
  const isTimedOut = result && !selected;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">
            {question!.category.replace(/_/g, " ")} · {question!.difficulty}
          </span>
          {question!.live && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 animate-pulse">LIVE</span>
          )}
        </div>
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
