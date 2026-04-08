import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      status: "spectator" | "active" | "suspended";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "user";
    status?: "spectator" | "active" | "suspended";
  }
}
