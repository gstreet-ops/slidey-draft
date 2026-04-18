"use client";

type DraftSlot = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamPrimaryColor: string | null;
  teamLogoUrl?: string | null;
};

type OnTheClockProps = {
  draftOrder: DraftSlot[];
  results: { pickNumber: number; playerName: string; playerPosition: string; teamAbbreviation: string }[];
  previousPickContext?: { userName: string; matchType: string | null; pointsAwarded: number | null }[];
};

function TeamLogo({ slot, size = "md" }: { slot: DraftSlot; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  if (!slot.teamLogoUrl) {
    return (
      <div
        className={`${sizeClass} rounded-lg shrink-0 flex items-center justify-center text-[var(--text-primary)] font-bold text-xs`}
        style={{ backgroundColor: slot.teamPrimaryColor || "#444" }}
      >
        {slot.teamAbbreviation.slice(0, 3)}
      </div>
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-lg shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: `${slot.teamPrimaryColor || "#333"}22` }}
    >
      <img src={slot.teamLogoUrl} alt={slot.teamName} className="h-full w-full object-contain p-0.5" />
    </div>
  );
}

export function OnTheClock({ draftOrder, results, previousPickContext }: OnTheClockProps) {
  const totalPicks = draftOrder.length;
  const completedCount = results.length;

  // Draft complete
  if (completedCount >= totalPicks) {
    const lastSlot = draftOrder.find(s => s.pickNumber === totalPicks);
    const lastResult = results.find(r => r.pickNumber === totalPicks);
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-5 flex items-center gap-4">
        <div className="flex-1 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">DRAFT COMPLETE</p>
          <p className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            All {totalPicks} picks are in
          </p>
          {lastResult && lastSlot && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Final pick: {lastResult.playerName} · {lastResult.playerPosition} · {lastSlot.teamAbbreviation}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentPickNumber = completedCount + 1;
  const nextPickNumber = completedCount + 2;

  const currentSlot = draftOrder.find(s => s.pickNumber === currentPickNumber);
  const nextSlot = draftOrder.find(s => s.pickNumber === nextPickNumber);
  const prevResult = completedCount > 0 ? results.find(r => r.pickNumber === completedCount) : null;
  const prevSlot = completedCount > 0 ? draftOrder.find(s => s.pickNumber === completedCount) : null;

  const hasPrev = !!(prevResult && prevSlot);
  const hasNext = !!(nextSlot && nextPickNumber <= totalPicks);

  const exactCallers = previousPickContext?.filter(c => c.matchType === "exact") ?? [];
  const closeCallers = previousPickContext?.filter(c => c.matchType === "close") ?? [];

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      {/* Previous Pick */}
      {hasPrev ? (
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 opacity-70">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            PICK #{prevResult!.pickNumber}
          </p>
          <div className="flex items-center gap-3">
            <TeamLogo slot={prevSlot!} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: "var(--font-display)" }}>
                {prevSlot!.teamName}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {prevResult!.playerName}
                <span className="ml-1 text-[var(--text-muted)]">{prevResult!.playerPosition}</span>
              </p>
            </div>
          </div>
          {(exactCallers.length > 0 || closeCallers.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {exactCallers.map((c, i) => (
                <span key={i} className="text-[10px] bg-green-500/25 text-green-700 rounded-full px-2 py-0.5 font-semibold">
                  {c.userName} nailed it!
                </span>
              ))}
              {closeCallers.map((c, i) => (
                <span key={i} className="text-[10px] bg-yellow-100 text-yellow-200 rounded-full px-2 py-0.5">
                  {c.userName} close (+{c.pointsAwarded})
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 hidden sm:block" />
      )}

      {/* Current / On The Clock */}
      {currentSlot && (
        <div
          className="flex-[1.4] rounded-xl border-2 px-5 py-4"
          style={{
            borderColor: currentSlot.teamPrimaryColor || "#666",
            backgroundColor: `${currentSlot.teamPrimaryColor || "#333"}18`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-block h-2 w-2 rounded-full bg-green-400"
              style={{ animation: "pulse 1.5s ease-in-out infinite" }}
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              ON THE CLOCK
            </p>
            <span className="ml-auto text-xs font-bold text-[var(--text-muted)]">#{currentSlot.pickNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <TeamLogo slot={currentSlot} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: "var(--font-display)" }}>
                {currentSlot.teamName}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Prediction window open</p>
            </div>
          </div>
        </div>
      )}

      {/* Next Up */}
      {hasNext ? (
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 opacity-60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            UP NEXT · #{nextSlot!.pickNumber}
          </p>
          <div className="flex items-center gap-3">
            <TeamLogo slot={nextSlot!} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: "var(--font-display)" }}>
                {nextSlot!.teamName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{nextSlot!.teamAbbreviation}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden sm:block" />
      )}
    </div>
  );
}
