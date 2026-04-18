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
import { eq, sql } from "drizzle-orm";
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
    async signIn({ user, profile }) {
      // First-time sign-in for a pre-seeded account: clear the flag and
      // backfill the Google profile picture / name if missing. The DrizzleAdapter
      // already matched the existing user by email, so user.id points at the
      // pre-seeded record.
      try {
        if (user.id) {
          const [existing] = await db
            .select({ id: users.id, name: users.name, image: users.image, isPreSeeded: users.isPreSeeded })
            .from(users)
            .where(eq(users.id, user.id));
          if (existing?.isPreSeeded) {
            await db
              .update(users)
              .set({
                isPreSeeded: false,
                // Keep the admin-set nickname if there was one; only fill from Google when blank
                name: existing.name || (profile as { name?: string } | undefined)?.name || user.name || existing.name,
                image: existing.image || (profile as { picture?: string } | undefined)?.picture || user.image || existing.image,
                status: "active",
              })
              .where(eq(users.id, user.id));
          }
        }
      } catch (error) {
        console.error("[AUTH] Failed to clear pre-seed flag:", error);
        // Don't block sign-in
      }

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
              await db.execute(sql`
                WITH insert_member AS (
                  INSERT INTO pool_members (pool_id, user_id, role)
                  VALUES (${pool.id}, ${user.id}, 'member')
                  ON CONFLICT DO NOTHING
                  RETURNING pool_id
                ),
                activate_user AS (
                  UPDATE users SET status = 'active'
                  WHERE id = ${user.id} AND status = 'spectator'
                    AND EXISTS (SELECT 1 FROM insert_member)
                )
                SELECT 1
              `);
            }
          } else if (inviteType === "commissioner") {
            // Upgrade to commissioner role
            const [invite] = await db
              .select()
              .from(commissionerInvites)
              .where(eq(commissionerInvites.code, pendingCode.toUpperCase().trim()));

            if (invite && !invite.usedBy && (!invite.expiresAt || invite.expiresAt > new Date())) {
              await db.execute(sql`
                WITH upgrade_user AS (
                  UPDATE users SET role = 'commissioner', status = 'active'
                  WHERE id = ${user.id}
                )
                UPDATE commissioner_invites
                SET used_by = ${user.id}, used_at = NOW()
                WHERE id = ${invite.id}
              `);
            }
          }

          // Clear cookies
          cookieStore.delete("slidey_pending_invite");
          cookieStore.delete("slidey_invite_type");
        }
      } catch (error) {
        console.error("[AUTH] Failed to process pending invite cookie:", error);
        // Don't block sign-in — user can rejoin manually
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, user.id),
        });
        session.user.name = dbUser?.name || user.name || '';
        session.user.email = dbUser?.email || user.email || "";
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
                primaryColor: team.primaryColor || "#FFB612",
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
