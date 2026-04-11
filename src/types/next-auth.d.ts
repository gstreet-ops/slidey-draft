import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "commissioner" | "user";
      status: "spectator" | "active" | "suspended";
      favoriteTeam: {
        id: string;
        name: string;
        abbreviation: string;
        primaryColor: string;
        secondaryColor: string;
        logoUrl: string | null;
      } | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "commissioner" | "user";
    status?: "spectator" | "active" | "suspended";
  }
}
