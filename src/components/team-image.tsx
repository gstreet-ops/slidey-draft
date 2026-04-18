import Image from "next/image";
import { getTeamTheme, type TeamTheme } from "@/lib/team-themes";

type Variant = "logo" | "altLogo" | "heroPlayer" | "legendPlayer" | "historyImage";

type Props = {
  teamCode: string | null | undefined;
  variant: Variant;
  size?: number;
  className?: string;
  /** What to render when no image is mapped for this team. */
  fallback?: "none" | "initials" | "color-block";
  /** 0–100. Pass low values for watermark usage. */
  opacity?: number;
  /** Decorative? Empty alt for screen readers. */
  alt?: string;
};

/**
 * Team-aware image with graceful fallback. Server-renderable.
 * 26 of 32 teams have no images — `fallback` controls what shows for them.
 */
export function TeamImage({
  teamCode,
  variant,
  size = 48,
  className = "",
  fallback = "none",
  opacity = 100,
  alt,
}: Props) {
  const theme: TeamTheme = getTeamTheme(teamCode);
  const src = theme[variant];

  if (!src) {
    if (fallback === "initials") {
      const textColor = theme.textOnPrimary === "black" ? "#101820" : "#FFFFFF";
      return (
        <div
          className={`flex items-center justify-center rounded-md font-bold shrink-0 ${className}`}
          style={{
            width: size,
            height: size,
            backgroundColor: theme.primary,
            color: textColor,
            fontSize: Math.max(10, Math.round(size * 0.36)),
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
            opacity: opacity / 100,
          }}
          aria-label={alt ?? theme.name}
        >
          {theme.abbreviation}
        </div>
      );
    }
    if (fallback === "color-block") {
      return (
        <div
          className={`rounded-md shrink-0 ${className}`}
          style={{
            width: size,
            height: size,
            backgroundColor: theme.primary,
            opacity: opacity / 100,
          }}
          aria-hidden
        />
      );
    }
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt ?? theme.name}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      style={{ opacity: opacity / 100 }}
    />
  );
}
