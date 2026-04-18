import Image from "next/image";
import { getTeamTheme } from "@/lib/team-themes";

type Props = {
  teamCode?: string | null;
  /** When true, renders a compact (~140px) version suited to interior pages. */
  compact?: boolean;
};

/**
 * Server component. Three layers:
 *  1. Solid team primary color (or with team's heroPlayer image as background)
 *  2. Subtle horizontal team-color → transparent → team-color fade so player image stays readable
 *  3. White Bebas team name + tagline + DRAFT 2026 badge with text-shadow for contrast
 *
 * Always white text in the hero (regardless of team accent text rule) — the
 * dark gradient overlay guarantees contrast on every team color.
 */
export function HeroBanner({ teamCode, compact = false }: Props) {
  const theme = getTeamTheme(teamCode);
  const heightClass = compact ? "h-[160px] sm:h-[180px]" : "h-[200px] sm:h-[260px]";

  // When we have a team player image, layer it under a horizontal team-color fade.
  // When we don't, use solid color + subtle diagonal stripe texture.
  const baseStyle: React.CSSProperties = theme.heroPlayer
    ? {
        backgroundColor: theme.primary,
      }
    : {
        backgroundColor: theme.primary,
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent, transparent 20px, rgba(255,255,255,0.04) 20px, rgba(255,255,255,0.04) 40px)",
      };

  return (
    <div className={`relative ${heightClass} overflow-hidden`} style={baseStyle}>
      {/* Player image (if present) */}
      {theme.heroPlayer && (
        <Image
          src={theme.heroPlayer}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-70"
        />
      )}

      {/* Team-color horizontal fade overlay so text stays readable */}
      {theme.heroPlayer && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${theme.primary} 0%, ${hexA(theme.primary, 0.55)} 35%, ${hexA(theme.primary, 0.35)} 65%, ${theme.primary} 100%)`,
          }}
          aria-hidden
        />
      )}

      {/* Bottom fade into page bg for clean handoff to white content */}
      <div
        className="absolute inset-x-0 bottom-0 h-10"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--bg-page))",
        }}
        aria-hidden
      />

      {/* Content overlay */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="flex-1 min-w-0 flex items-end gap-4">
          {theme.logo && (
            <Image
              src={theme.logo}
              alt={`${theme.name} logo`}
              width={64}
              height={64}
              className="hidden sm:block h-16 w-16 object-contain shrink-0 mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            />
          )}
          <div className="min-w-0">
            <p
              className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-white/85"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              {theme.city}
            </p>
            <h2
              className={`mt-1 leading-none tracking-wide text-white truncate ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl"}`}
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              }}
            >
              {theme.name.toUpperCase()}
            </h2>
            {!compact && (
              <p
                className="mt-2 text-xs sm:text-sm font-medium text-white/85"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
              >
                {theme.tagline}
              </p>
            )}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0 ml-4">
          <span
            className="rounded-md px-3 py-1 text-[10px] font-bold tracking-widest text-white"
            style={{
              fontFamily: "var(--font-display)",
              background: "rgba(0,0,0,0.35)",
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

function hexA(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
