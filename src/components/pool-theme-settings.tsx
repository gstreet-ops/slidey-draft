"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#FFB612", "#97233F", "#125740", "#101820",
];

type Props = {
  poolId: string;
  currentPrimary: string | null;
  currentSecondary: string | null;
};

export function PoolThemeSettings({ poolId, currentPrimary, currentSecondary }: Props) {
  const [primary, setPrimary] = useState(currentPrimary || "");
  const [secondary, setSecondary] = useState(currentSecondary || "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/pools/${poolId}/theme`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryColor: primary || null, secondaryColor: secondary || null }),
    });
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
          Primary Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setPrimary(color)}
              className={`h-8 w-8 rounded-full border-2 transition ${
                primary === color ? "border-white scale-110" : "border-transparent hover:border-white/30"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            onClick={() => setPrimary("")}
            className={`h-8 w-8 rounded-full border-2 transition flex items-center justify-center text-xs text-[var(--text-muted)] ${
              !primary ? "border-white" : "border-[var(--border)] hover:border-white/30"
            }`}
            style={{ backgroundColor: "#333" }}
          >
            ✕
          </button>
        </div>
        {primary && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-5 w-5 rounded" style={{ backgroundColor: primary }} />
            <span className="text-xs text-[var(--text-muted)]">{primary}</span>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
          Secondary Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSecondary(color)}
              className={`h-8 w-8 rounded-full border-2 transition ${
                secondary === color ? "border-white scale-110" : "border-transparent hover:border-white/30"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            onClick={() => setSecondary("")}
            className={`h-8 w-8 rounded-full border-2 transition flex items-center justify-center text-xs text-[var(--text-muted)] ${
              !secondary ? "border-white" : "border-[var(--border)] hover:border-white/30"
            }`}
            style={{ backgroundColor: "#333" }}
          >
            ✕
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[var(--slidey)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-80 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Theme"}
      </button>
    </div>
  );
}
