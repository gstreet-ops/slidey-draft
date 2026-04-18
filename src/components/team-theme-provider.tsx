"use client";

import { useSession } from "next-auth/react";
import { useEffect, createContext, useContext, useState, useCallback } from "react";
import { getTeamTheme } from "@/lib/team-themes";

type PoolTheme = {
  primaryColor: string;
  secondaryColor: string;
} | null;

const PoolThemeContext = createContext<{
  poolTheme: PoolTheme;
  setPoolTheme: (theme: PoolTheme) => void;
}>({
  poolTheme: null,
  setPoolTheme: () => {},
});

export function usePoolTheme() {
  return useContext(PoolThemeContext);
}

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const team = (session?.user as {
    favoriteTeam?: { primaryColor: string; secondaryColor: string; abbreviation: string };
  })?.favoriteTeam;
  const [poolTheme, setPoolTheme] = useState<PoolTheme>(null);

  const handleSetPoolTheme = useCallback((theme: PoolTheme) => {
    setPoolTheme(theme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Resolve which palette drives the accent: pool overrides team, team overrides default.
    let accentPrimary = "#FFB612";
    let accentSecondary = "#CC9200";
    let accentText: "white" | "black" = "black";

    if (poolTheme) {
      accentPrimary = poolTheme.primaryColor;
      accentSecondary = poolTheme.secondaryColor;
      accentText = pickContrast(poolTheme.primaryColor);
    } else if (team) {
      const meta = getTeamTheme(team.abbreviation);
      accentPrimary = team.primaryColor;
      accentSecondary = team.secondaryColor;
      accentText = meta.textOnPrimary;
    }

    // --slidey and --steelers-gold alias to --accent-primary in globals.css, so they update automatically.
    root.style.setProperty("--accent-primary", accentPrimary);
    root.style.setProperty("--accent-secondary", accentSecondary);
    root.style.setProperty("--accent-text", accentText);
    root.style.setProperty("--accent-light", toAlpha(accentPrimary, 0.12));

    if (poolTheme) {
      root.style.setProperty("--pool-primary", poolTheme.primaryColor);
      root.style.setProperty("--pool-secondary", poolTheme.secondaryColor);
    } else {
      root.style.removeProperty("--pool-primary");
      root.style.removeProperty("--pool-secondary");
    }

    if (team) {
      root.style.setProperty("--team-primary", team.primaryColor);
      root.style.setProperty("--team-secondary", team.secondaryColor);
    } else {
      root.style.removeProperty("--team-primary");
      root.style.removeProperty("--team-secondary");
    }
  }, [team, poolTheme]);

  return (
    <PoolThemeContext.Provider value={{ poolTheme, setPoolTheme: handleSetPoolTheme }}>
      {children}
    </PoolThemeContext.Provider>
  );
}

function pickContrast(hex: string): "white" | "black" {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "white";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "black" : "white";
}

function toAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return `rgba(255, 182, 18, ${alpha})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
