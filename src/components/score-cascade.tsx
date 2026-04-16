"use client";

import { useState, useEffect, useRef } from "react";

type Props = {
  targetScore: number;
  pointsEarned: number;
  matchType: string;
  animate: boolean;
};

const MATCH_COLORS: Record<string, string> = {
  exact: "text-green-400",
  close: "text-yellow-400",
  far: "text-orange-400",
  miss: "text-red-400",
};

export function ScoreCascade({ targetScore, pointsEarned, matchType, animate }: Props) {
  const [displayScore, setDisplayScore] = useState(targetScore - pointsEarned);
  const [showBadge, setShowBadge] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!animate || animatedRef.current) return;
    animatedRef.current = true;

    const startScore = targetScore - pointsEarned;
    const duration = 500;
    const startTime = Date.now();

    setShowBadge(true);
    setPulsing(true);

    const ticker = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(startScore + (pointsEarned * progress)));

      if (progress >= 1) {
        clearInterval(ticker);
        setTimeout(() => setPulsing(false), 300);
        setTimeout(() => setShowBadge(false), 2000);
      }
    }, 16);

    return () => clearInterval(ticker);
  }, [animate, targetScore, pointsEarned]);

  useEffect(() => {
    animatedRef.current = false;
  }, [targetScore]);

  return (
    <div className="relative text-right">
      <span
        className="text-2xl font-bold text-white"
        style={pulsing ? { animation: "score-pulse 0.6s ease-in-out" } : undefined}
      >
        {displayScore}
      </span>
      <span className="text-sm text-white/50 ml-1">pts</span>

      {showBadge && pointsEarned > 0 && (
        <span
          className={`absolute -top-4 right-0 text-sm font-bold ${MATCH_COLORS[matchType] || "text-white"}`}
          style={{ animation: "points-pop 2s ease-out forwards" }}
        >
          +{pointsEarned}
        </span>
      )}
    </div>
  );
}
