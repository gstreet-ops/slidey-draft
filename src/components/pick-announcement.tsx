"use client";

import { useEffect, useState, useRef } from "react";

type PickContext = {
  userName: string;
  matchType: string | null;
  pointsAwarded: number | null;
};

type Props = {
  pickNumber: number;
  playerName: string;
  playerPosition: string;
  playerSchool: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl?: string | null;
  matchType: string | null;
  context?: PickContext[];
  onDismiss: () => void;
};

const MATCH_MESSAGES: Record<string, string> = {
  exact: "NAILED IT!",
  close: "Close call!",
  far: "Not quite...",
  miss: "Tough break",
};

export function PickAnnouncement({
  pickNumber,
  playerName,
  playerPosition,
  playerSchool,
  teamName,
  teamAbbreviation,
  teamPrimaryColor,
  teamLogoUrl,
  matchType,
  context,
  onDismiss,
}: Props) {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDismissing(true);
      setTimeout(onDismiss, 400);
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  function handleClick() {
    setDismissing(true);
    clearTimeout(timerRef.current);
    setTimeout(onDismiss, 400);
  }

  const bgColor = teamPrimaryColor || "#333";

  return (
    <div
      className="relative overflow-hidden rounded-xl cursor-pointer"
      style={{
        animation: dismissing ? "banner-dismiss 0.4s ease-in forwards" : "slide-down 0.5s ease-out",
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
      }}
      onClick={handleClick}
    >
      <div className="relative z-10 px-6 py-5 flex items-center gap-4">
        {teamLogoUrl && (
          <img src={teamLogoUrl} alt={teamName} className="h-14 w-14 object-contain opacity-90" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            PICK #{pickNumber} IS IN
          </p>
          <p className="text-2xl font-bold text-white truncate" style={{ fontFamily: "var(--font-display)" }}>
            {playerName}
          </p>
          <p className="text-sm text-white/70">
            {playerPosition} &middot; {playerSchool} &middot; {teamAbbreviation}
          </p>
        </div>
        {matchType && (
          <div className="shrink-0 text-right">
            <p className={`text-lg font-bold ${matchType === "exact" ? "text-green-300" : "text-white/80"}`}
               style={{ fontFamily: "var(--font-display)" }}>
              {MATCH_MESSAGES[matchType] || ""}
            </p>
          </div>
        )}
      </div>

      {/* Who had this pick */}
      {context && context.length > 0 && (
        <div className="relative z-10 px-6 pb-3 flex flex-wrap gap-2">
          {context.filter(c => c.matchType === "exact").map((c, i) => (
            <span key={i} className="text-xs bg-green-500/30 text-green-200 rounded-full px-2.5 py-0.5 font-semibold">
              {c.userName} nailed it!
            </span>
          ))}
          {context.filter(c => c.matchType === "close").map((c, i) => (
            <span key={i} className="text-xs bg-yellow-500/20 text-yellow-200 rounded-full px-2.5 py-0.5">
              {c.userName} had him close (+{c.pointsAwarded})
            </span>
          ))}
        </div>
      )}

      {matchType === "exact" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 30}%`,
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"][i % 5],
                animation: `confetti-fall ${0.8 + Math.random() * 1.2}s ease-out ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
