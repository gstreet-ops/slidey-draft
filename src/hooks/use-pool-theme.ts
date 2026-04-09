"use client";

import { useEffect } from "react";
import { usePoolTheme } from "@/components/team-theme-provider";

/**
 * Call this in any pool page to activate the pool's color theme.
 * Pass null to clear (e.g., on unmount handled automatically).
 */
export function useActivatePoolTheme(pool: { primaryColor?: string | null; secondaryColor?: string | null } | null) {
  const { setPoolTheme } = usePoolTheme();

  useEffect(() => {
    if (pool?.primaryColor) {
      setPoolTheme({
        primaryColor: pool.primaryColor,
        secondaryColor: pool.secondaryColor || "#000000",
      });
    }

    return () => {
      setPoolTheme(null);
    };
  }, [pool?.primaryColor, pool?.secondaryColor, setPoolTheme]);
}
