"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Team = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  logoUrl: string | null;
};

export function TeamPicker({
  teams,
  selectedTeamId,
  redirectTo,
}: {
  teams: Team[];
  selectedTeamId?: string | null;
  redirectTo?: string;
}) {
  const [selected, setSelected] = useState<string | null>(selectedTeamId ?? null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  async function persist(teamId: string | null) {
    if (saving) return;
    setSelected(teamId);
    setSaving(true);

    await fetch("/api/user/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });

    await update();

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {teams.map((team) => {
          const isSelected = selected === team.id;
          return (
            <button
              key={team.id}
              onClick={() => persist(team.id)}
              disabled={saving}
              title={team.name}
              className={`group relative flex flex-col items-center gap-2 rounded-lg bg-[var(--surface-card)] p-3 transition overflow-hidden ${
                isSelected
                  ? "ring-2 ring-[var(--accent-primary)] scale-[1.02]"
                  : "border border-white/10 hover:border-white/20 hover:bg-[var(--surface-elevated)]"
              } ${saving ? "opacity-50 cursor-wait" : ""}`}
            >
              <span
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundColor: team.primaryColor }}
                aria-hidden
              />
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  width={44}
                  height={44}
                  className="mt-1 h-11 w-11 object-contain"
                />
              ) : (
                <div
                  className="mt-1 flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: team.primaryColor }}
                >
                  {team.abbreviation}
                </div>
              )}
              <span className="text-[11px] font-semibold text-white/70 leading-tight tracking-wide">
                {team.abbreviation}
              </span>
              <span className="text-[10px] text-white/40 leading-tight text-center line-clamp-1">
                {team.name.split(" ").slice(0, -1).join(" ")}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => persist(null)}
          disabled={saving}
          className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline transition"
        >
          Reset to draft default (Steelers)
        </button>
      )}
    </div>
  );
}
