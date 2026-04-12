"use server";

import { db } from "@/db";
import { eq, and, desc, asc, sql, isNull, notInArray } from "drizzle-orm";
import {
  draftBoards,
  picks,
  actualResults,
  appInvites,
  users,
  pools,
  poolMembers,
  poolAnnouncements,
  draftOrder,
  players,
  chatMessages,
  commissionerInvites,
  poolInviteCodes,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { scoreAllBoards } from "@/lib/scoring";
import { requireActiveUser } from "@/lib/auth-helpers";
import {
  generateAppInviteCode,
  generatePoolInviteCode,
  canManagePool,
  getPoolRole,
  DEFAULT_POOL_SETTINGS,
} from "@/lib/pool-helpers";
import {
  scoreLivePredictions,
  recalculateAllPools,
} from "@/lib/pool-scoring";
import { getUserById, isPoolMember } from "@/lib/queries";

// ── Create a new mock draft board ──────────────────
export async function createBoard(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const title = (formData.get("title") as string)?.trim();
  if (!title || title.length > 200) throw new Error("Title is required (max 200 chars)");
  const season = Number(formData.get("season") || 2026);

  const [board] = await db
    .insert(draftBoards)
    .values({
      title,
      season,
      type: "mock",
      status: "draft",
    })
    .returning();

  revalidatePath("/admin");
  return board;
}

// ── Create a personal user board ───────────────────
export async function createUserBoard(season: number) {
  const session = await requireActiveUser();
  if (!session?.user?.id) throw new Error("Active account required to create a mock draft");

  const userName = session.user.name || session.user.email?.split("@")[0] || "Player";

  const [board] = await db
    .insert(draftBoards)
    .values({
      title: `${userName}'s Mock Draft`,
      season,
      type: "mock",
      status: "draft",
      createdBy: session.user.id,
    })
    .returning();

  return board;
}

// ── Make a pick on a board ─────────────────────────
export async function makePick(
  boardId: string,
  pickNumber: number,
  playerId: string,
  teamId: string,
  analysis?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [board] = await db
    .select({ createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) throw new Error("Board not found");
  if (board.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new Error("Not authorized");
  }

  // Check if player is already picked on this board
  const [existing] = await db
    .select({ pickNumber: picks.pickNumber })
    .from(picks)
    .where(and(eq(picks.boardId, boardId), eq(picks.playerId, playerId)));

  if (existing) {
    throw new Error(`Player already selected at pick #${existing.pickNumber}`);
  }

  const [pick] = await db
    .insert(picks)
    .values({
      boardId,
      pickNumber,
      playerId,
      teamId,
      analysis: analysis || null,
      confidence: null,
    })
    .onConflictDoNothing()
    .returning();

  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/my-board`);
  revalidatePath(`/picks/${boardId}`);
  return pick;
}

// ── Remove a pick ──────────────────────────────────
export async function removePick(pickId: string, boardId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [board] = await db
    .select({ createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) throw new Error("Board not found");
  if (board.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new Error("Not authorized");
  }

  await db.delete(picks).where(eq(picks.id, pickId));
  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/my-board`);
  revalidatePath(`/picks/${boardId}`);
}

// ── Publish a board ────────────────────────────────
export async function publishBoard(boardId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [board] = await db
    .select({ createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) throw new Error("Board not found");
  if (board.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new Error("Not authorized");
  }

  await db
    .update(draftBoards)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(draftBoards.id, boardId));

  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/my-board`);
  revalidatePath(`/picks/${boardId}`);
  revalidatePath("/picks");
}


// ── Enter an actual draft result (admin only) ─────
export async function enterActualResult(
  season: number,
  pickNumber: number,
  playerId: string,
  teamId: string
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const [result] = await db
    .insert(actualResults)
    .values({
      season,
      pickNumber,
      playerId,
      teamId,
      announcedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (result) {
    // Auto-score all published boards (global leaderboard)
    await scoreAllBoards(season);
    // Score live predictions and recalculate pool standings
    await scoreLivePredictions(pickNumber, playerId);
    await recalculateAllPools();
  }

  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  revalidatePath("/pools");
  return result;
}

// ── Undo last actual result (admin only) ───────────
export async function undoLastResult(season: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const [last] = await db
    .select()
    .from(actualResults)
    .where(eq(actualResults.season, season))
    .orderBy(desc(actualResults.pickNumber))
    .limit(1);

  if (!last) return null;

  await db.delete(actualResults).where(eq(actualResults.id, last.id));
  await scoreAllBoards(season);

  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  revalidatePath("/live");
  return last;
}


// ═══════════════════════════════════════════════════
// PHASE 3: App Invites
// ═══════════════════════════════════════════════════

// ── Generate an app invite code ───────────────────
export async function generateInvite() {
  const session = await requireActiveUser();
  if (!session) throw new Error("Must be an active user to generate invites");

  const code = await generateAppInviteCode();

  const [invite] = await db
    .insert(appInvites)
    .values({
      code,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/settings");
  return invite;
}

// ── Bulk generate app invite codes (admin only) ───
export async function bulkGenerateInvites(count: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }
  if (count < 1 || count > 100) throw new Error("Count must be 1-100");

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = await generateAppInviteCode();
    codes.push(code);
  }

  await db.insert(appInvites).values(
    codes.map((code) => ({
      code,
      createdBy: session.user.id,
    }))
  );

  revalidatePath("/admin");
  return codes;
}

// ── Claim an app invite code ──────────────────────
export async function claimInviteCode(code: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  if (session.user.status === "active") {
    return { success: false, message: "You already have full access!" };
  }

  const [invite] = await db
    .select()
    .from(appInvites)
    .where(eq(appInvites.code, code.toUpperCase().trim()));

  if (!invite) {
    return { success: false, message: "Invalid invite code." };
  }
  if (invite.claimedBy) {
    return { success: false, message: "This invite code has already been used." };
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { success: false, message: "This invite code has expired." };
  }

  // Claim the invite
  await db
    .update(appInvites)
    .set({
      claimedBy: session.user.id,
      claimedAt: new Date(),
    })
    .where(eq(appInvites.id, invite.id));

  // Upgrade user to active
  await db
    .update(users)
    .set({ status: "active" })
    .where(eq(users.id, session.user.id));

  revalidatePath("/");
  return { success: true, message: "Welcome! You now have full access." };
}

// ── Get invites created by user ───────────────────
export async function getMyInvites() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db
    .select({
      id: appInvites.id,
      code: appInvites.code,
      claimedBy: appInvites.claimedBy,
      claimedAt: appInvites.claimedAt,
      createdAt: appInvites.createdAt,
      claimerName: users.name,
      claimerEmail: users.email,
    })
    .from(appInvites)
    .leftJoin(users, eq(appInvites.claimedBy, users.id))
    .where(eq(appInvites.createdBy, session.user.id))
    .orderBy(desc(appInvites.createdAt));
}

// ── Admin: manually activate a user ───────────────
export async function activateUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  await db
    .update(users)
    .set({ status: "active" })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
}

// ═══════════════════════════════════════════════════
// PHASE 3: Pools
// ═══════════════════════════════════════════════════

// ── Create a pool ─────────────────────────────────
export async function createPool(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  if (session.user.role !== "commissioner" && session.user.role !== "admin") {
    throw new Error("Only commissioners and admins can create pools");
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!name) throw new Error("Pool name is required");

  const inviteCode = await generatePoolInviteCode();

  const [pool] = await db
    .insert(pools)
    .values({
      name,
      description,
      commissionerId: session.user.id,
      inviteCode,
      settings: DEFAULT_POOL_SETTINGS,
    })
    .returning();

  // Add creator as commissioner member
  await db.insert(poolMembers).values({
    poolId: pool.id,
    userId: session.user.id,
    role: "commissioner",
  });

  revalidatePath("/pools");
  return pool;
}

// ── Join a pool ───────────────────────────────────
export async function joinPool(inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const code = inviteCode.toUpperCase().trim();

  // First try the pool's open invite code
  let [pool] = await db
    .select()
    .from(pools)
    .where(eq(pools.inviteCode, code));

  let singleCodeId: string | null = null;

  // If not found, check poolInviteCodes table (single-use codes)
  if (!pool) {
    const [inviteRow] = await db
      .select({
        id: poolInviteCodes.id,
        poolId: poolInviteCodes.poolId,
        type: poolInviteCodes.type,
        usedBy: poolInviteCodes.usedBy,
        revokedAt: poolInviteCodes.revokedAt,
      })
      .from(poolInviteCodes)
      .where(eq(poolInviteCodes.code, code));

    if (!inviteRow) return { success: false, message: "Pool not found." };
    if (inviteRow.revokedAt) return { success: false, message: "This invite is no longer valid." };
    if (inviteRow.type === "single" && inviteRow.usedBy) {
      return { success: false, message: "This invite has already been used." };
    }

    const [p] = await db.select().from(pools).where(eq(pools.id, inviteRow.poolId));
    if (!p) return { success: false, message: "Pool not found." };
    pool = p;
    if (inviteRow.type === "single") singleCodeId = inviteRow.id;
  }

  if (pool.status === "locked" || pool.status === "completed") {
    return { success: false, message: "This pool is no longer accepting members." };
  }

  // Check max members
  const settings = pool.settings as Record<string, unknown>;
  if (settings?.maxMembers) {
    const memberCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, pool.id));
    if (memberCount[0].count >= (settings.maxMembers as number)) {
      return { success: false, message: "This pool is full." };
    }
  }

  // Check entry deadline
  if (settings?.entryDeadline) {
    const deadline = new Date(settings.entryDeadline as string);
    if (new Date() > deadline) {
      return { success: false, message: "The entry deadline has passed." };
    }
  }

  await db
    .insert(poolMembers)
    .values({
      poolId: pool.id,
      userId: session.user.id,
      role: "member",
    })
    .onConflictDoNothing();

  // Mark single-use code as used
  if (singleCodeId) {
    await db
      .update(poolInviteCodes)
      .set({ usedBy: session.user.id, usedAt: new Date() })
      .where(eq(poolInviteCodes.id, singleCodeId));
  }

  // Activate spectators when they join via pool invite
  if (session.user.status === "spectator") {
    await db
      .update(users)
      .set({ status: "active" })
      .where(eq(users.id, session.user.id));
  }

  revalidatePath(`/pools/${pool.id}`);
  revalidatePath("/pools");
  return { success: true, poolId: pool.id };
}

// ── Update pool settings ──────────────────────────
export async function updatePoolSettings(
  poolId: string,
  updates: { name?: string; description?: string; settings?: Record<string, unknown> }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const allowed = await canManagePool(session.user.id, poolId);
  if (!allowed) throw new Error("Not authorized");

  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.name) setValues.name = updates.name;
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.settings) setValues.settings = updates.settings;

  await db.update(pools).set(setValues).where(eq(pools.id, poolId));

  revalidatePath(`/pools/${poolId}`);
  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Lock a pool ───────────────────────────────────
export async function lockPool(poolId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const allowed = await canManagePool(session.user.id, poolId);
  if (!allowed) throw new Error("Not authorized");

  await db
    .update(pools)
    .set({ status: "locked", updatedAt: new Date() })
    .where(eq(pools.id, poolId));

  revalidatePath(`/pools/${poolId}`);
}

// ── Delete a pool (commissioner only) ─────────────
export async function deletePool(poolId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner") throw new Error("Only the commissioner can delete a pool");

  await db.delete(pools).where(eq(pools.id, poolId));
  revalidatePath("/pools");
}

// ── Promote member to admin ───────────────────────
export async function promoteToAdmin(poolId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin") throw new Error("Only commissioners can promote to admin");

  await db
    .update(poolMembers)
    .set({ role: "admin" })
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );

  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Demote admin to member ────────────────────────
export async function demoteToMember(poolId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin") throw new Error("Only commissioners can demote members");

  await db
    .update(poolMembers)
    .set({ role: "member" })
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );

  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Promote to commissioner ───────────────────────
export async function promoteToCommissioner(poolId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin") throw new Error("Only commissioners can promote to commissioner");

  await db
    .update(poolMembers)
    .set({ role: "commissioner" })
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );

  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Demote commissioner to admin ──────────────────
export async function demoteFromCommissioner(poolId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner" && role !== "admin") throw new Error("Only commissioners can demote");

  // Cannot demote the pool owner
  const [pool] = await db.select({ commissionerId: pools.commissionerId }).from(pools).where(eq(pools.id, poolId));
  if (pool && userId === pool.commissionerId) throw new Error("Cannot demote the pool owner — use transfer instead");

  // Cannot demote if they're the last commissioner
  const commissioners = await db
    .select({ userId: poolMembers.userId })
    .from(poolMembers)
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.role, "commissioner")));
  if (commissioners.length <= 1) throw new Error("Pool must have at least one commissioner");

  await db
    .update(poolMembers)
    .set({ role: "admin" })
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );

  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Remove member from pool ───────────────────────
export async function removePoolMember(poolId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const myRole = await getPoolRole(session.user.id, poolId);
  if (myRole !== "commissioner" && myRole !== "admin") {
    throw new Error("Not authorized");
  }

  // Can't remove commissioner
  const targetRole = await getPoolRole(userId, poolId);
  if (targetRole === "commissioner") throw new Error("Cannot remove the commissioner");
  // Admins can't remove other admins
  if (myRole === "admin" && targetRole === "admin") {
    throw new Error("Admins cannot remove other admins");
  }

  await db
    .delete(poolMembers)
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );

  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Transfer commissioner ownership ───────────────
export async function transferCommissioner(poolId: string, newCommissionerId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const role = await getPoolRole(session.user.id, poolId);
  if (role !== "commissioner") throw new Error("Only the commissioner can transfer ownership");

  // Demote current commissioner to admin
  await db
    .update(poolMembers)
    .set({ role: "admin" })
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, session.user.id))
    );

  // Promote new commissioner
  await db
    .update(poolMembers)
    .set({ role: "commissioner" })
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, newCommissionerId))
    );

  // Update pool record
  await db
    .update(pools)
    .set({ commissionerId: newCommissionerId, updatedAt: new Date() })
    .where(eq(pools.id, poolId));

  revalidatePath(`/pools/${poolId}/settings`);
}

// ── Post announcement ─────────────────────────────
export async function postAnnouncement(poolId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const allowed = await canManagePool(session.user.id, poolId);
  if (!allowed) throw new Error("Not authorized");

  await db.insert(poolAnnouncements).values({
    poolId,
    authorId: session.user.id,
    content: content.trim(),
  });

  revalidatePath(`/pools/${poolId}`);
}

// ── Pin/unpin announcement ────────────────────────
export async function toggleAnnouncementPin(poolId: string, announcementId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const allowed = await canManagePool(session.user.id, poolId);
  if (!allowed) throw new Error("Not authorized");

  const [ann] = await db
    .select({ pinned: poolAnnouncements.pinned })
    .from(poolAnnouncements)
    .where(eq(poolAnnouncements.id, announcementId));

  if (ann) {
    await db
      .update(poolAnnouncements)
      .set({ pinned: !ann.pinned })
      .where(eq(poolAnnouncements.id, announcementId));
  }

  revalidatePath(`/pools/${poolId}`);
}

// ── Auto-fill remaining picks by player rank ────────
export async function autoFillByRank(
  boardId: string,
  mode: "round" | "all",
  currentRound?: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Get the board and verify ownership
  const [board] = await db
    .select({ season: draftBoards.season, createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) throw new Error("Board not found");
  if (board.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new Error("Not authorized");
  }

  // Get draft order for this season
  const slots = await db
    .select()
    .from(draftOrder)
    .where(eq(draftOrder.season, board.season))
    .orderBy(asc(draftOrder.pickNumber));

  // Get existing picks for this board
  const existingPicks = await db
    .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.boardId, boardId));

  const pickedNumbers = new Set(existingPicks.map((p) => p.pickNumber));
  const pickedPlayerIds = new Set(existingPicks.map((p) => p.playerId));

  // Filter to empty slots based on mode
  let emptySlots = slots.filter((s) => !pickedNumbers.has(s.pickNumber));
  if (mode === "round" && currentRound) {
    emptySlots = emptySlots.filter(
      (s) =>
        s.pickNumber > (currentRound - 1) * 32 &&
        s.pickNumber <= currentRound * 32
    );
  }

  if (emptySlots.length === 0) return 0;

  // Get all ranked players sorted by rank
  const rankedPlayers = await db
    .select({ id: players.id, rank: players.rank })
    .from(players)
    .where(sql`${players.rank} IS NOT NULL`)
    .orderBy(asc(players.rank));

  // Fill each empty slot with the next available ranked player
  let filledCount = 0;
  const usedPlayerIds = new Set(pickedPlayerIds);

  for (const slot of emptySlots) {
    const nextPlayer = rankedPlayers.find((p) => !usedPlayerIds.has(p.id));
    if (!nextPlayer) break;

    await db.insert(picks).values({
      boardId,
      pickNumber: slot.pickNumber,
      playerId: nextPlayer.id,
      teamId: slot.teamId,
      autoFilled: true,
    });

    usedPlayerIds.add(nextPlayer.id);
    filledCount++;
  }

  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/my-board`);
  return filledCount;
}
// ── Pool Chat ───────────────────────────────────────
export async function sendChatMessage(poolId: string, content: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const user = await getUserById(session.user.id);
  if (!user || user.status !== "active") throw new Error("Spectators cannot send messages");

  const member = await isPoolMember(poolId, session.user.id);
  if (!member) throw new Error("Not a pool member");

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 500) throw new Error("Message must be 1-500 characters");

  await db.insert(chatMessages).values({
    poolId,
    userId: session.user.id,
    content: trimmed,
  });

  revalidatePath(`/pools/${poolId}`);
}

// ═══════════════════════════════════════════════════
// Commissioner Invites
// ═══════════════════════════════════════════════════

export async function generateCommissionerInvite(poolName?: string, expirationDays: number = 7) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const code = await generateAppInviteCode();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  const [invite] = await db
    .insert(commissionerInvites)
    .values({
      code,
      createdBy: session.user.id,
      expiresAt,
      poolName: poolName?.trim() || null,
    })
    .returning();

  revalidatePath("/admin");
  return invite;
}

export async function getCommissionerInvites() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  return db
    .select({
      id: commissionerInvites.id,
      code: commissionerInvites.code,
      poolName: commissionerInvites.poolName,
      createdAt: commissionerInvites.createdAt,
      expiresAt: commissionerInvites.expiresAt,
      usedBy: commissionerInvites.usedBy,
      usedAt: commissionerInvites.usedAt,
      usedByName: users.name,
      usedByEmail: users.email,
    })
    .from(commissionerInvites)
    .leftJoin(users, eq(commissionerInvites.usedBy, users.id))
    .orderBy(desc(commissionerInvites.createdAt));
}

export async function revokeCommissionerInvite(inviteId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  await db.delete(commissionerInvites).where(eq(commissionerInvites.id, inviteId));
  revalidatePath("/admin");
}

export async function claimCommissionerInvite(code: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  if (session.user.role === "commissioner" || session.user.role === "admin") {
    return { success: true, message: "You're already a commissioner!", alreadyCommissioner: true };
  }

  const [invite] = await db
    .select()
    .from(commissionerInvites)
    .where(eq(commissionerInvites.code, code.toUpperCase().trim()));

  if (!invite) {
    return { success: false, message: "Invalid commissioner invite code." };
  }
  if (invite.usedBy) {
    return { success: false, message: "This commissioner invite has already been used." };
  }
  if (invite.expiresAt < new Date()) {
    return { success: false, message: "This commissioner invite has expired." };
  }

  await db
    .update(users)
    .set({ role: "commissioner", status: "active" })
    .where(eq(users.id, session.user.id));

  await db
    .update(commissionerInvites)
    .set({ usedBy: session.user.id, usedAt: new Date() })
    .where(eq(commissionerInvites.id, invite.id));

  revalidatePath("/");
  return { success: true, message: "You're now a commissioner!", poolName: invite.poolName };
}

export async function getCommissioners() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const commissioners = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, "commissioner"));

  const result = [];
  for (const c of commissioners) {
    const userPools = await db
      .select({ id: pools.id, memberCount: sql<number>`(SELECT COUNT(*) FROM pool_members WHERE pool_id = ${pools.id})` })
      .from(pools)
      .where(eq(pools.commissionerId, c.id));
    result.push({
      ...c,
      poolCount: userPools.length,
      totalMembers: userPools.reduce((sum, p) => sum + Number(p.memberCount), 0),
    });
  }
  return result;
}

export async function demoteCommissioner(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  await db
    .update(users)
    .set({ role: "user" })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
}

// ── Pool Invite Codes ────────────────────────────

export async function generatePoolInviteCodes(poolId: string, count: number = 1) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const canManage_ = await canManagePool(session.user.id, poolId);
  if (!canManage_) throw new Error("Not authorized");

  const codes: { id: string; code: string }[] = [];
  for (let i = 0; i < count; i++) {
    const code = await generatePoolInviteCode();
    const [row] = await db
      .insert(poolInviteCodes)
      .values({ poolId, code, type: "single" })
      .returning({ id: poolInviteCodes.id, code: poolInviteCodes.code });
    codes.push(row);
  }

  revalidatePath(`/pools/${poolId}`);
  return codes;
}

export async function getPoolInviteCodes(poolId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const canManage_ = await canManagePool(session.user.id, poolId);
  if (!canManage_) throw new Error("Not authorized");

  return db
    .select({
      id: poolInviteCodes.id,
      code: poolInviteCodes.code,
      type: poolInviteCodes.type,
      usedBy: poolInviteCodes.usedBy,
      usedAt: poolInviteCodes.usedAt,
      revokedAt: poolInviteCodes.revokedAt,
      createdAt: poolInviteCodes.createdAt,
      usedByName: users.name,
      usedByEmail: users.email,
    })
    .from(poolInviteCodes)
    .leftJoin(users, eq(poolInviteCodes.usedBy, users.id))
    .where(eq(poolInviteCodes.poolId, poolId))
    .orderBy(desc(poolInviteCodes.createdAt));
}

export async function revokePoolInviteCode(codeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Get the code to find poolId for auth check
  const [code] = await db
    .select({ poolId: poolInviteCodes.poolId, usedBy: poolInviteCodes.usedBy })
    .from(poolInviteCodes)
    .where(eq(poolInviteCodes.id, codeId));
  if (!code) throw new Error("Code not found");
  if (code.usedBy) throw new Error("Cannot revoke a used code");

  const canManage_ = await canManagePool(session.user.id, code.poolId);
  if (!canManage_) throw new Error("Not authorized");

  await db
    .update(poolInviteCodes)
    .set({ revokedAt: new Date() })
    .where(eq(poolInviteCodes.id, codeId));

  revalidatePath(`/pools/${code.poolId}`);
}
