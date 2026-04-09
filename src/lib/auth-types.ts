import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "admin" | "user";
      status: "spectator" | "active" | "suspended";
      favoriteTeam: {
        id: string;
        name: string;
        abbreviation: string;
        primaryColor: string;
        secondaryColor: string;
        logoUrl: string | null;
      } | null;
    };
  }
}
