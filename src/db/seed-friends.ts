/**
 * One-time / idempotent seed for pre-seeding the initial group of friends.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx src/db/seed-friends.ts
 *
 * Each friend gets:
 *   - a user record (status=active, isPreSeeded=true) keyed by email
 *   - their favorite team set
 *   - membership in the admin's primary commissioner pool
 *   - a default 32-pick mock draft auto-filled via consensus rankings
 *
 * On their first Google sign-in, the auth signIn callback flips isPreSeeded=false
 * and backfills the Google profile picture if missing — they land on /my-board
 * with their picks already there.
 */

import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { users, pools, poolMembers } from "./schema";
import { preSeedUserCore } from "@/lib/seed-helpers";

const FRIENDS: Array<{ nickname: string; email: string; team: string }> = [
  { nickname: "Slidey",   email: "jeffkdowney@gmail.com", team: "BUF" },
  { nickname: "Franc",    email: "fachoya88@gmail.com",   team: "NYG" },
  { nickname: "Thurston", email: "danfren@gmail.com",     team: "DET" },
  { nickname: "Huey",     email: "mblewis5@gmail.com",    team: "LAR" },
  { nickname: "Glets",    email: "tjghoya@gmail.com",     team: "WAS" },
  { nickname: "Pipes",    email: "pdmann34@gmail.com",    team: "CHI" },
];

async function findAdminPool(): Promise<string | null> {
  const admins = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"));
  if (admins.length === 0) {
    console.error("No admin user found. Make yourself admin first.");
    return null;
  }
  // Try each admin in turn — return the first pool found.
  for (const admin of admins) {
    const [myPool] = await db
      .select({ id: pools.id, name: pools.name })
      .from(poolMembers)
      .innerJoin(pools, eq(poolMembers.poolId, pools.id))
      .where(and(eq(poolMembers.userId, admin.id), eq(poolMembers.role, "commissioner")))
      .limit(1);
    if (myPool) {
      console.log(`Using pool "${myPool.name}" (admin: ${admin.email})`);
      return myPool.id;
    }
    const [adminPool] = await db
      .select({ id: pools.id, name: pools.name })
      .from(pools)
      .where(eq(pools.commissionerId, admin.id))
      .limit(1);
    if (adminPool) {
      console.log(`Using pool "${adminPool.name}" (admin: ${admin.email})`);
      return adminPool.id;
    }
  }
  return null;
}

async function main() {
  const poolId = await findAdminPool();
  if (!poolId) {
    console.error("No pool found. Create a pool as admin first.");
    process.exit(1);
  }
  console.log(`Seeding ${FRIENDS.length} friends into pool ${poolId}…\n`);

  for (const f of FRIENDS) {
    try {
      const r = await preSeedUserCore({
        email: f.email,
        teamAbbreviation: f.team,
        nickname: f.nickname,
        poolId,
      });
      console.log(
        `  ${f.nickname.padEnd(10)} ${f.email.padEnd(30)} ${f.team.padEnd(4)}` +
          ` user=${r.userId.slice(0, 8)}… board=${r.boardId.slice(0, 8)}…` +
          ` picksFilled=${r.picksFilled}` +
          (r.alreadyExisted ? " [user existed]" : "") +
          (r.alreadyInPool ? " [already in pool]" : "")
      );
    } catch (e) {
      console.error(`  ✗ ${f.nickname}: ${(e as Error).message}`);
    }
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
