"use client";

import { useActivatePoolTheme } from "@/hooks/use-pool-theme";

/**
 * Drop this into any pool page to activate the pool's theme.
 * Pass the pool's colors as props from the server component.
 */
export function PoolThemeActivator({
  primaryColor,
  secondaryColor,
}: {
  primaryColor: string | null;
  secondaryColor: string | null;
}) {
  useActivatePoolTheme(
    primaryColor ? { primaryColor, secondaryColor } : null
  );
  return null;
}
