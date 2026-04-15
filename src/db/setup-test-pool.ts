import { db } from "./index";
import { users, pools, poolMembers, appInvites } from "./schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  // Step 1: Find brian
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status, role: users.role })
    .from(users)
    .orderBy(users.createdAt);
  console.log("\n=== ALL USERS ===");
  for (const u of allUsers) {
    console.log(`  ${u.name} | ${u.email} | status=${u.status} | role=${u.role} | id=${u.id}`);
  }

  const brian = allUsers.find((u) => u.email === "brian@globestreet.com");
  if (!brian) {
    console.error("Brian not found!");
    process.exit(1);
  }
  console.log(`\nBrian's ID: ${brian.id}, status: ${brian.status}, role: ${brian.role}`);

  // Step 2: Check existing pools
  const existingPools = await db
    .select({ id: pools.id, name: pools.name, inviteCode: pools.inviteCode, status: pools.status })
    .from(pools);
  console.log("\n=== EXISTING POOLS ===");
  if (existingPools.length === 0) {
    console.log("  (none)");
  } else {
    for (const p of existingPools) {
      console.log(`  ${p.name} | code=${p.inviteCode} | status=${p.status} | id=${p.id}`);
    }
  }

  // Create pool if none exists
  if (existingPools.length === 0) {
    console.log("\nCreating pool 'Slidey Draft Night 2026'...");
    const [newPool] = await db
      .insert(pools)
      .values({
        name: "Slidey Draft Night 2026",
        commissionerId: brian.id,
        inviteCode: "DRAFT1",
        status: "open",
        settings: {
          rounds: [1],
          mockDraftBonus: true,
          livePredictions: true,
          trivia: true,
          entryDeadline: null,
          maxMembers: null,
          mockPointValues: { playerCalled: 3, rangeClose: 2, rangeFar: 1, exactSlot: 5, positionMatch: 1 },
          livePointValues: { correctPlayer: 10 },
          triviaPointValues: { correct: 5 },
        },
        description: "The main Draft Day Challenge pool. Predict picks, answer trivia, beat your friends.",
      })
      .returning({ id: pools.id });

    console.log(`Pool created: ${newPool.id}`);

    // Add brian as commissioner
    await db.insert(poolMembers).values({
      poolId: newPool.id,
      userId: brian.id,
      role: "commissioner",
    });
    console.log("Brian added as commissioner.");
  } else {
    console.log("\nPool already exists, skipping creation.");
  }

  // Verify pool
  const poolCheck = await db
    .select({
      poolId: pools.id,
      poolName: pools.name,
      inviteCode: pools.inviteCode,
      status: pools.status,
      role: poolMembers.role,
    })
    .from(pools)
    .innerJoin(poolMembers, eq(poolMembers.poolId, pools.id))
    .where(eq(poolMembers.userId, brian.id));
  console.log("\n=== BRIAN'S POOLS ===");
  for (const p of poolCheck) {
    console.log(`  ${p.poolName} | code=${p.inviteCode} | status=${p.status} | role=${p.role} | id=${p.poolId}`);
  }

  // Step 3: Generate app invite codes
  const existingInvites = await db
    .select({ code: appInvites.code, claimedBy: appInvites.claimedBy })
    .from(appInvites)
    .where(eq(appInvites.createdBy, brian.id));
  console.log("\n=== EXISTING APP INVITES (by brian) ===");
  if (existingInvites.length === 0) {
    console.log("  (none)");
  } else {
    for (const inv of existingInvites) {
      console.log(`  ${inv.code} | claimed=${inv.claimedBy ? "yes" : "no"}`);
    }
  }

  const codes = ["FRIEND01", "FRIEND02", "FRIEND03", "FRIEND04", "FRIEND05"];
  const existingCodes = new Set(existingInvites.map((i) => i.code));
  const newCodes = codes.filter((c) => !existingCodes.has(c));

  if (newCodes.length > 0) {
    console.log(`\nGenerating ${newCodes.length} new invite codes...`);
    await db.insert(appInvites).values(
      newCodes.map((code) => ({
        code,
        createdBy: brian.id,
      }))
    );
    console.log("Done.");
  } else {
    console.log("\nAll invite codes already exist, skipping.");
  }

  // Final verification
  const finalInvites = await db
    .select({ code: appInvites.code, claimedBy: appInvites.claimedBy, claimedAt: appInvites.claimedAt })
    .from(appInvites)
    .where(eq(appInvites.createdBy, brian.id));
  console.log("\n=== FINAL APP INVITES ===");
  for (const inv of finalInvites) {
    console.log(`  ${inv.code} | claimed=${inv.claimedBy ? "yes" : "no"}`);
  }

  console.log("\n=== URLS ===");
  console.log("Pool invite: https://slidey-draft.vercel.app/pools/join/DRAFT1");
  for (const c of codes) {
    console.log(`App invite:  https://slidey-draft.vercel.app/invite/${c}`);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
