"use client";

import { SessionProvider } from "next-auth/react";
import { TeamThemeProvider } from "@/components/team-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TeamThemeProvider>{children}</TeamThemeProvider>
    </SessionProvider>
  );
}
