import type { CSSProperties } from "react";

export interface CategoryLike {
  name: string;
  color: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((c) => Number.isNaN(c))) return null;
  return { r, g, b };
}

// WCAG relative luminance — returns 0 (darkest) to 1 (lightest).
function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

// Choose a foreground that contrasts with the given background.
export function textColorFor(hex: string): string {
  return luminance(hex) > 0.55 ? "#1a1a2e" : "#ffffff";
}

const FALLBACK_COLOR = "#6B7280";

export function colorForCategory(name: string, categories: CategoryLike[] | undefined | null): string {
  if (!name || !categories) return FALLBACK_COLOR;
  const match = categories.find((c) => c.name === name);
  return match?.color || FALLBACK_COLOR;
}

interface CategoryBadgeProps {
  /** Category display name, e.g. "NFL History". */
  name: string;
  /** Master category list; used to look up the color. Pass the cached array from state. */
  categories?: CategoryLike[] | null;
  /** Override color directly if you already have the hex on hand. */
  color?: string;
  size?: "xs" | "sm";
  className?: string;
  title?: string;
}

/**
 * Shared colored pill for trivia category labels.
 * Pulls its color from the master `trivia_categories` list (passed in as a prop
 * so the component stays a pure client concern and we don't refetch everywhere).
 */
export function CategoryBadge({
  name,
  categories,
  color: colorProp,
  size = "sm",
  className = "",
  title,
}: CategoryBadgeProps) {
  const bg = colorProp || colorForCategory(name, categories);
  const fg = textColorFor(bg);

  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.5 text-[9px]"
      : "px-2 py-0.5 text-xs";

  const style: CSSProperties = {
    backgroundColor: bg,
    color: fg,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${sizeClasses} ${className}`}
      style={style}
      title={title ?? name}
    >
      {name}
    </span>
  );
}
