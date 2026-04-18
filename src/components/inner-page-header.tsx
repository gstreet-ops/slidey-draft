import Image from "next/image";
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
 * Solid team-color strip + Bebas title + optional subtitle. Team stripe under.
 *
 * Image-rich treatment when the team has art:
 *  - logo (always tried, falls back to initials chip)
 *  - altLogo as a faint right-side watermark
 *  - heroPlayer as a circular avatar on the right (above the watermark)
 */
export function InnerPageHeader({ title, subtitle, teamCode }: Props) {
  const theme = getTeamTheme(teamCode);

  return (
    <>
      <div
        className="relative h-20 sm:h-24 flex items-center overflow-hidden"
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

        {/* Alt logo watermark — far right, very faded */}
        {theme.altLogo && (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden sm:flex items-center pr-32" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theme.altLogo}
              alt=""
              className="h-[140%] w-auto object-contain opacity-15"
            />
          </div>
        )}

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

          {/* Hero player avatar — right side, only when present */}
          {theme.heroPlayer && (
            <div
              className="hidden sm:block h-14 w-14 shrink-0 rounded-full overflow-hidden border-2"
              style={{ borderColor: "rgba(255,255,255,0.6)" }}
              aria-hidden
            >
              <Image
                src={theme.heroPlayer}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
      <TeamStripe />
    </>
  );
}
