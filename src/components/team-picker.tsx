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

  async function handleSelect(teamId: string) {
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
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-4">
      {teams.map((team) => {
        const isSelected = selected === team.id;
        return (
          <button
            key={team.id}
            onClick={() => handleSelect(team.id)}
            disabled={saving}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition ${
              isSelected
                ? "ring-2 ring-white bg-white/15 scale-105"
                : "bg-white/5 hover:bg-white/10"
            } ${saving ? "opacity-50 cursor-wait" : ""}`}
          >
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: team.primaryColor }}
              >
                {team.abbreviation}
              </div>
            )}
            <span className="text-[10px] text-white/60 text-center leading-tight">
              {team.abbreviation}
            </span>
          </button>
        );
      })}
    </div>
  );
}
