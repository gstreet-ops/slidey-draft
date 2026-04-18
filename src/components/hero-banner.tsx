import { getTeamTheme } from "@/lib/team-themes";

type Props = {
  teamCode?: string | null;
  /** When true, renders a compact (≤120px) version suited to interior pages. */
  compact?: boolean;
};

/**
 * Server component. Renders a CSS-gradient backdrop in the user's team colors
 * (no external image dependencies — distinct per team, no network calls).
 * Bebas Neue city/team name overlay + DRAFT 2026 badge.
 */
export function HeroBanner({ teamCode, compact = false }: Props) {
  const theme = getTeamTheme(teamCode);
  const height = compact ? "h-[120px] sm:h-[140px]" : "h-[220px] sm:h-[260px]";

  return (
    <div className={`relative ${height} overflow-hidden`}>
      {/* Base gradient: primary → secondary, deep angle */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 60%, ${theme.primary} 100%)`,
        }}
        aria-hidden
      />
      {/* Subtle radial highlight for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      {/* Diagonal field-stripe texture */}
      <div
        className="absolute inset-0 opacity-15 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(120deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, transparent 2px, transparent 64px)",
        }}
        aria-hidden
      />
      {/* Bottom fade into page bg */}
      <div
        className="absolute inset-x-0 bottom-0 h-16"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--bg-page))",
        }}
        aria-hidden
      />

      {/* Content overlay */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: theme.textOnPrimary === "black" ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.85)" }}
          >
            {theme.city}
          </p>
          <h2
            className={`mt-1 leading-none tracking-wide ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl"}`}
            style={{
              fontFamily: "var(--font-display)",
              color: theme.textOnPrimary === "black" ? "#101820" : "#FFFFFF",
              textShadow: theme.textOnPrimary === "black" ? "none" : "0 2px 12px rgba(0,0,0,0.35)",
            }}
          >
            {theme.name.toUpperCase()}
          </h2>
          {!compact && (
            <p
              className="mt-2 text-xs sm:text-sm font-medium"
              style={{ color: theme.textOnPrimary === "black" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)" }}
            >
              {theme.tagline}
            </p>
          )}
        </div>
        <div
          className="hidden sm:flex flex-col items-end shrink-0 ml-4"
          style={{ color: theme.textOnPrimary === "black" ? "#101820" : "#FFFFFF" }}
        >
          <span
            className="rounded-md px-3 py-1 text-[10px] font-bold tracking-widest"
            style={{
              fontFamily: "var(--font-display)",
              background: theme.textOnPrimary === "black" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)",
              backdropFilter: "blur(4px)",
            }}
          >
            DRAFT 2026
          </span>
        </div>
      </div>
    </div>
  );
}

export function TeamStripe() {
  return (
    <div
      className="h-1 w-full"
      style={{
        background:
          "repeating-linear-gradient(90deg, var(--accent-primary) 0px, var(--accent-primary) 40px, var(--accent-secondary) 40px, var(--accent-secondary) 80px)",
      }}
      aria-hidden
    />
  );
}
