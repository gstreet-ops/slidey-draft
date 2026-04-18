import { getTeamTheme } from "@/lib/team-themes";
import { TeamImage } from "./team-image";
import { TeamStripe } from "./hero-banner";

type Props = {
  title: string;
  subtitle?: string;
  teamCode?: string | null;
};

/**
 * Compact team-color page header for interior pages (no full hero banner).
 * 80px solid accent strip + Bebas title + optional subtitle. Team stripe under.
 * Always-white text — team color guarantees a dark-enough background.
 */
export function InnerPageHeader({ title, subtitle, teamCode }: Props) {
  const theme = getTeamTheme(teamCode);

  return (
    <>
      <div
        className="relative h-20 sm:h-24 flex items-center"
        style={{ backgroundColor: theme.primary }}
      >
        {/* Subtle diagonal stripe texture */}
        <div
          className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 16px, rgba(255,255,255,0.18) 16px, rgba(255,255,255,0.18) 32px)",
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <TeamImage
            teamCode={teamCode ?? null}
            variant="logo"
            size={40}
            fallback="initials"
            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
          />
          <div className="flex-1 min-w-0">
            <h1
              className="leading-none tracking-wide text-white text-2xl sm:text-3xl truncate"
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 1px 6px rgba(0,0,0,0.35)",
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-1 text-xs sm:text-sm text-white/85 truncate"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
      <TeamStripe />
    </>
  );
}
