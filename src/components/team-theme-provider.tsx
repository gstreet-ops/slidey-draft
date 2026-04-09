"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const team = (session?.user as { favoriteTeam?: { primaryColor: string; secondaryColor: string } })?.favoriteTeam;

  useEffect(() => {
    const root = document.documentElement;
    if (team) {
      root.style.setProperty("--team-primary", team.primaryColor);
      root.style.setProperty("--team-secondary", team.secondaryColor);
      root.style.setProperty("--slidey", team.primaryColor);
    } else {
      root.style.removeProperty("--team-primary");
      root.style.removeProperty("--team-secondary");
      root.style.setProperty("--slidey", "#4A7AB5");
    }
  }, [team]);

  return <>{children}</>;
}
