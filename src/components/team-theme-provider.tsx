"use client";

import { useSession } from "next-auth/react";
import { useEffect, createContext, useContext, useState, useCallback } from "react";

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
  const team = (session?.user as { favoriteTeam?: { primaryColor: string; secondaryColor: string } })?.favoriteTeam;
  const [poolTheme, setPoolTheme] = useState<PoolTheme>(null);

  const handleSetPoolTheme = useCallback((theme: PoolTheme) => {
    setPoolTheme(theme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Pool theme takes priority for accent color when set
    if (poolTheme) {
      root.style.setProperty("--slidey", poolTheme.primaryColor);
      root.style.setProperty("--pool-primary", poolTheme.primaryColor);
      root.style.setProperty("--pool-secondary", poolTheme.secondaryColor);
    } else if (team) {
      root.style.setProperty("--slidey", team.primaryColor);
      root.style.removeProperty("--pool-primary");
      root.style.removeProperty("--pool-secondary");
    } else {
      root.style.setProperty("--slidey", "#4A7AB5");
      root.style.removeProperty("--pool-primary");
      root.style.removeProperty("--pool-secondary");
    }

    // Team colors always set (user identity persists)
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
