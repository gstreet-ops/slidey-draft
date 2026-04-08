"use client";

import { useState } from "react";
import Image from "next/image";

const positionColors: Record<string, string> = {
  QB: "#e11d48",
  RB: "#2563eb",
  WR: "#f59e0b",
  TE: "#8b5cf6",
  OT: "#64748b",
  IOL: "#64748b",
  OG: "#64748b",
  OC: "#64748b",
  EDGE: "#059669",
  DL: "#059669",
  DT: "#059669",
  DE: "#059669",
  LB: "#dc2626",
  CB: "#0891b2",
  S: "#6366f1",
  "WR/CB": "#0891b2",
};

export function PlayerAvatar({
  player,
  size = 36,
}: {
  player: { name: string; imageUrl?: string | null; position: string };
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  if (!player.imageUrl || imgError) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
        style={{
          width: size,
          height: size,
          backgroundColor: positionColors[player.position] || "#475569",
          fontSize: size * 0.35,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={player.imageUrl}
      alt={player.name}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}
