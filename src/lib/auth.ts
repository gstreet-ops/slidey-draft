import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, user.id),
        });
        session.user.role = dbUser?.role || "user";
        session.user.status = dbUser?.status || "spectator";

        // Fetch favorite team
        if (dbUser?.favoriteTeamId) {
          const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, dbUser.favoriteTeamId!),
          });
          session.user.favoriteTeam = team
            ? {
                id: team.id,
                name: team.name,
                abbreviation: team.abbreviation,
                primaryColor: team.primaryColor || "#4A7AB5",
                secondaryColor: team.secondaryColor || "#000000",
                logoUrl: team.logoUrl,
              }
            : null;
        } else {
          session.user.favoriteTeam = null;
        }
      }
      return session;
    },
  },
});
