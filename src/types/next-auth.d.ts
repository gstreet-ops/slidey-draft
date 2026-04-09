import { DefaultSession } from "next-auth";

export type FavoriteTeam = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      status: "spectator" | "active" | "suspended";
      favoriteTeam: FavoriteTeam | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "user";
    status?: "spectator" | "active" | "suspended";
  }
}
