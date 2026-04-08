"use client";

import { useState, useRef, useEffect } from "react";
import { PlayerAvatar } from "./player-avatar";

type Prospect = {
  name: string;
  position: string;
  school: string;
  rank?: number | null;
  height?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
  notes?: string | null;
  grade?: number | null;
  positionRank?: number | null;
  fortyTime?: number | null;
  vertical?: number | null;
  benchPress?: number | null;
  broadJump?: number | null;
  threeConeDrill?: number | null;
  shuttle?: number | null;
  nflComparison?: string | null;
};

type Props = {
  prospect: Prospect;
  children: React.ReactNode;
  onTap?: () => void;
};

function gradeColor(grade: number): string {
  if (grade >= 90) return "text-green-500 bg-green-500/10";
  if (grade >= 80) return "text-blue-500 bg-blue-500/10";
  if (grade >= 70) return "text-yellow-500 bg-yellow-500/10";
  return "text-red-500 bg-red-500/10";
}

export function ProspectHoverCard({ prospect, children, onTap }: Props) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("below");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Determine if card should appear above or below
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceBelow < 260 ? "above" : "below");
    }
    timeoutRef.current = setTimeout(() => setShow(true), 200);
  }

  function handleLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 150);
  }

  const measurables: { label: string; value: string }[] = [];
  if (prospect.fortyTime) measurables.push({ label: "40", value: `${prospect.fortyTime}s` });
  if (prospect.height) measurables.push({ label: "HT", value: prospect.height });
  if (prospect.weight) measurables.push({ label: "WT", value: `${prospect.weight}` });
  if (prospect.vertical) measurables.push({ label: "VERT", value: `${prospect.vertical}"` });
  if (prospect.benchPress) measurables.push({ label: "BP", value: `${prospect.benchPress}` });

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onTap}
    >
      {children}

      {/* Hover card */}
      {show && (
        <div
          className={`absolute left-0 z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl transition-opacity ${
            position === "above" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseLeave={handleLeave}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <PlayerAvatar player={prospect} size={48} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {prospect.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {prospect.position}
                </span>
                <span className="text-xs text-gray-500">{prospect.school}</span>
              </div>
              {prospect.nflComparison && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Comp: <span className="font-medium text-gray-600">{prospect.nflComparison}</span>
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 mb-3">
            {prospect.positionRank && (
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{prospect.positionRank}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">POS RK</p>
              </div>
            )}
            {prospect.rank && (
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{prospect.rank}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">OVR</p>
              </div>
            )}
            {prospect.grade && (
              <div className="text-center">
                <p className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-lg font-bold ${gradeColor(prospect.grade)}`}>
                  {prospect.grade}
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">GRADE</p>
              </div>
            )}
          </div>

          {/* Measurables mini-grid */}
          {measurables.length > 0 && (
            <div className="flex gap-2 mb-3">
              {measurables.slice(0, 5).map((m) => (
                <div key={m.label} className="flex-1 rounded bg-gray-50 px-1.5 py-1 text-center">
                  <p className="text-xs font-bold text-gray-800">{m.value}</p>
                  <p className="text-[8px] font-semibold uppercase text-gray-400">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Scouting snippet */}
          {prospect.notes && (
            <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-3">
              {prospect.notes}
            </p>
          )}

          <p className="mt-2 text-[10px] text-blue-500 font-medium">Click for full report →</p>
        </div>
      )}
    </div>
  );
}
