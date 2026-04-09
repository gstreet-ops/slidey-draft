"use client";

type Props = {
  pickNumber: number;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl?: string | null;
};

export function OnTheClock({ pickNumber, teamName, teamAbbreviation, teamPrimaryColor, teamLogoUrl }: Props) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl border px-5 py-4"
      style={{
        borderColor: `${teamPrimaryColor || "#666"}66`,
        backgroundColor: `${teamPrimaryColor || "#333"}15`,
      }}
    >
      {teamLogoUrl && (
        <img src={teamLogoUrl} alt={teamName} className="h-10 w-10 object-contain" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-white/50">ON THE CLOCK</p>
        <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          {teamName}
        </p>
      </div>
      <div className="text-right">
        <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          #{pickNumber}
        </p>
      </div>
    </div>
  );
}
