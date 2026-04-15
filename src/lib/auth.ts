import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  pools,
  poolMembers,
  commissionerInvites,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

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
    async signIn({ user }) {
      // Process pending invite cookies after OAuth
      try {
        const cookieStore = await cookies();
        const pendingCode = cookieStore.get("slidey_pending_invite")?.value;
        const inviteType = cookieStore.get("slidey_invite_type")?.value;

        if (pendingCode && inviteType && user.id) {
          if (inviteType === "pool") {
            // Upgrade spectator to active and auto-join pool
            const [pool] = await db
              .select()
              .from(pools)
              .where(eq(pools.inviteCode, pendingCode.toUpperCase().trim()));

            if (pool && pool.status === "open") {
              await db
                .update(users)
                .set({ status: "active" })
                .where(eq(users.id, user.id));

              await db
                .insert(poolMembers)
                .values({ poolId: pool.id, userId: user.id, role: "member" })
                .onConflictDoNothing();
            }
          } else if (inviteType === "commissioner") {
            // Upgrade to commissioner role
            const [invite] = await db
              .select()
              .from(commissionerInvites)
              .where(eq(commissionerInvites.code, pendingCode.toUpperCase().trim()));

            if (invite && !invite.usedBy && (!invite.expiresAt || invite.expiresAt > new Date())) {
              await db
                .update(users)
                .set({ role: "commissioner", status: "active" })
                .where(eq(users.id, user.id));

              await db
                .update(commissionerInvites)
                .set({ usedBy: user.id, usedAt: new Date() })
                .where(eq(commissionerInvites.id, invite.id));
            }
          }

          // Clear cookies
          cookieStore.delete("slidey_pending_invite");
          cookieStore.delete("slidey_invite_type");
        }
      } catch {
        // Don't block sign-in if cookie processing fails
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, user.id),
        });
        session.user.name = dbUser?.name || user.name || null;
        session.user.email = dbUser?.email || user.email || null;
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
