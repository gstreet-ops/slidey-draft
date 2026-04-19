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
  props,
  propPicks,
  trades,
  teams,
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
/** Creates the user's first mock draft for the season. Always marked as
 *  the entry draft. For additional boards, use {@link createAdditionalUserBoard}. */
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
      isEntryDraft: true,
    })
    .returning();

  return board;
}

/** Creates an additional non-entry mock draft board for the user. Titled
 *  "<Nickname>'s Mock Draft N" where N is the next available ordinal.
 *  Returns the new board's id. */
export async function createAdditionalUserBoard(season: number) {
  const session = await requireActiveUser();
  if (!session?.user?.id) throw new Error("Active account required to create a mock draft");

  const userName = session.user.name || session.user.email?.split("@")[0] || "Player";

  const existing = await db
    .select({ id: draftBoards.id, title: draftBoards.title })
    .from(draftBoards)
    .where(
      and(
        eq(draftBoards.createdBy, session.user.id),
        eq(draftBoards.season, season),
        eq(draftBoards.type, "mock")
      )
    );
  const nextOrdinal = existing.length + 1;
  const title = `${userName}'s Mock Draft ${nextOrdinal}`;

  const [board] = await db
    .insert(draftBoards)
    .values({
      title,
      season,
      type: "mock",
      status: "draft",
      createdBy: session.user.id,
      isEntryDraft: false,
    })
    .returning();

  revalidatePath("/mock-drafts");
  return board;
}

/** Atomically swap the entry-draft flag to a different board owned by the
 *  current user. All the user's other season boards are cleared. */
export async function setEntryBoard(boardId: string) {
  const session = await requireActiveUser();
  if (!session?.user?.id) throw new Error("Active account required");

  const [board] = await db
    .select({
      id: draftBoards.id,
      createdBy: draftBoards.createdBy,
      season: draftBoards.season,
    })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));

  if (!board) throw new Error("Board not found");
  if (board.createdBy !== session.user.id) throw new Error("Not your board");

  await db
    .update(draftBoards)
    .set({ isEntryDraft: false })
    .where(
      and(
        eq(draftBoards.createdBy, session.user.id),
        eq(draftBoards.season, board.season)
      )
    );

  await db
    .update(draftBoards)
    .set({ isEntryDraft: true })
    .where(eq(draftBoards.id, boardId));

  revalidatePath("/mock-drafts");
  revalidatePath("/");
  return { ok: true };
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
  revalidatePath(`/mock-drafts`);
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
  revalidatePath(`/mock-drafts`);
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
  revalidatePath(`/mock-drafts`);
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

  // Insert member + activate spectator + mark single-use code in one batch.
  // Neon HTTP doesn't support transactions, so we use a single raw SQL statement
  // to atomically insert the member and activate the user.
  await db.execute(sql`
    WITH insert_member AS (
      INSERT INTO pool_members (pool_id, user_id, role)
      VALUES (${pool.id}, ${session.user.id}, 'member')
      ON CONFLICT DO NOTHING
      RETURNING pool_id
    ),
    activate_user AS (
      UPDATE users SET status = 'active'
      WHERE id = ${session.user.id} AND status = 'spectator'
        AND EXISTS (SELECT 1 FROM insert_member)
    )
    SELECT 1
  `);

  // Mark single-use code as used (non-critical — if this fails, code stays valid but user is in pool)
  if (singleCodeId) {
    await db
      .update(poolInviteCodes)
      .set({ usedBy: session.user.id, usedAt: new Date() })
      .where(eq(poolInviteCodes.id, singleCodeId));
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
  revalidatePath(`/mock-drafts`);
  return filledCount;
}
// ── Update pick analysis note ─────────────────────
export async function updatePickAnalysis(pickId: string, analysis: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [pick] = await db
    .select({ boardId: picks.boardId })
    .from(picks)
    .where(eq(picks.id, pickId));
  if (!pick) throw new Error("Pick not found");

  const [board] = await db
    .select({ createdBy: draftBoards.createdBy })
    .from(draftBoards)
    .where(eq(draftBoards.id, pick.boardId));
  if (!board || board.createdBy !== session.user.id) throw new Error("Not authorized");

  await db
    .update(picks)
    .set({ analysis: analysis.trim() || null })
    .where(eq(picks.id, pickId));

  revalidatePath("/mock-drafts");
  revalidatePath(`/picks/${pick.boardId}`);
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

  // Upgrade user + mark invite used in a single SQL statement for atomicity
  // (Neon HTTP doesn't support transactions)
  await db.execute(sql`
    WITH upgrade_user AS (
      UPDATE users SET role = 'commissioner', status = 'active'
      WHERE id = ${session.user.id}
    )
    UPDATE commissioner_invites
    SET used_by = ${session.user.id}, used_at = NOW()
    WHERE id = ${invite.id}
  `);

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

// ── Submit Prop Pick ─────────────────────────────
export async function submitPropPick(propId: string, poolId: string, answer: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify prop is open
  const [prop] = await db.select({ status: props.status }).from(props).where(eq(props.id, propId));
  if (!prop) throw new Error("Prop not found");
  if (prop.status !== "open") throw new Error("This prop is no longer accepting picks");

  // Verify user is pool member
  const member = await isPoolMember(poolId, session.user.id);
  if (!member) throw new Error("Not a pool member");

  // Upsert
  const existing = await db
    .select({ id: propPicks.id })
    .from(propPicks)
    .where(and(
      eq(propPicks.propId, propId),
      eq(propPicks.userId, session.user.id),
      eq(propPicks.poolId, poolId),
    ));

  if (existing.length > 0) {
    await db.update(propPicks)
      .set({ answer: answer.trim(), submittedAt: new Date() })
      .where(eq(propPicks.id, existing[0].id));
  } else {
    await db.insert(propPicks).values({
      propId,
      userId: session.user.id,
      poolId,
      answer: answer.trim(),
    });
  }

  revalidatePath("/props");
}

// ── Clear Prop Pick ──────────────────────────────
export async function clearPropPick(propId: string, poolId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [prop] = await db.select({ status: props.status }).from(props).where(eq(props.id, propId));
  if (!prop) throw new Error("Prop not found");
  if (prop.status !== "open") throw new Error("Cannot clear pick on a locked or resolved prop");

  await db
    .delete(propPicks)
    .where(
      and(
        eq(propPicks.propId, propId),
        eq(propPicks.userId, session.user.id),
        eq(propPicks.poolId, poolId)
      )
    );

  revalidatePath("/props");
}

// ── Create Custom Prop ───────────────────────────
export async function createCustomProp(
  poolId: string,
  data: { question: string; type: string; options?: unknown; points: number; category: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const allowed = await canManagePool(session.user.id, poolId);
  if (!allowed) throw new Error("Not authorized");

  const [prop] = await db
    .insert(props)
    .values({
      poolId,
      question: data.question.trim(),
      type: data.type as "over_under" | "pick_player" | "pick_team" | "yes_no" | "pick_number",
      options: data.options ?? null,
      points: Math.max(1, Math.min(20, data.points)),
      category: data.category.trim() || "custom",
      createdBy: session.user.id,
      status: "open",
      sortOrder: 100,
    })
    .returning();

  revalidatePath(`/pools/${poolId}/settings`);
  revalidatePath("/props");
  return prop;
}

// ── Delete Custom Prop ───────────────────────────
export async function deleteCustomProp(propId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [prop] = await db.select().from(props).where(eq(props.id, propId));
  if (!prop || !prop.poolId) throw new Error("Prop not found or is a global prop");

  const allowed = await canManagePool(session.user.id, prop.poolId);
  if (!allowed) throw new Error("Not authorized");

  // Check if any picks exist
  const [pickCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(propPicks)
    .where(eq(propPicks.propId, propId));

  if (Number(pickCount.c) > 0) {
    throw new Error("Cannot delete — players have already made picks on this prop");
  }

  await db.delete(props).where(eq(props.id, propId));
  revalidatePath(`/pools/${prop.poolId}/settings`);
  revalidatePath("/props");
}

// ── Resolve Custom Prop ──────────────────────────
export async function resolveCustomProp(propId: string, correctAnswer: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [prop] = await db.select().from(props).where(eq(props.id, propId));
  if (!prop || !prop.poolId) throw new Error("Prop not found or is a global prop");
  if (prop.status === "resolved") throw new Error("Already resolved");

  const allowed = await canManagePool(session.user.id, prop.poolId);
  if (!allowed) throw new Error("Not authorized");

  // Update prop
  await db
    .update(props)
    .set({ correctAnswer: correctAnswer.trim(), status: "resolved", resolvedAt: new Date() })
    .where(eq(props.id, propId));

  // Score all picks for this prop
  const allPicks = await db
    .select()
    .from(propPicks)
    .where(eq(propPicks.propId, propId));

  for (const pick of allPicks) {
    const isCorrect = pick.answer === correctAnswer.trim();
    const points = isCorrect ? prop.points : 0;
    await db
      .update(propPicks)
      .set({ isCorrect, pointsAwarded: points })
      .where(eq(propPicks.id, pick.id));
  }

  // Recalculate pool standings
  const { recalculatePoolStandings } = await import("@/lib/pool-scoring");
  await recalculatePoolStandings(prop.poolId);

  revalidatePath(`/pools/${prop.poolId}/settings`);
  revalidatePath("/props");
}

// ── Admin: pre-seed friend account + default mock draft ───────────────

export async function preSeedFriend(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const email = (formData.get("email") as string)?.trim();
  const teamAbbreviation = (formData.get("team") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim() || undefined;

  if (!email || !email.includes("@")) throw new Error("Valid email required");
  if (!teamAbbreviation) throw new Error("Team is required");

  // Find the admin's first commissioner pool (or any pool they own)
  const [myPool] = await db
    .select({ id: pools.id })
    .from(poolMembers)
    .innerJoin(pools, eq(poolMembers.poolId, pools.id))
    .where(
      and(
        eq(poolMembers.userId, session.user.id),
        eq(poolMembers.role, "commissioner")
      )
    )
    .limit(1);

  let poolId = myPool?.id;
  if (!poolId) {
    const [adminPool] = await db
      .select({ id: pools.id })
      .from(pools)
      .where(eq(pools.commissionerId, session.user.id))
      .limit(1);
    poolId = adminPool?.id;
  }
  if (!poolId) throw new Error("No pool found — create a pool first");

  const { preSeedUserCore } = await import("@/lib/seed-helpers");
  const result = await preSeedUserCore({
    email,
    teamAbbreviation,
    nickname,
    poolId,
  });
  revalidatePath("/admin");
  return result;
}

// ═══════════════════════════════════════════════════
// Draft Order Trades — manual commissioner/admin entry
// ═══════════════════════════════════════════════════

/** Records a trade: updates draft_order.teamId to newTeamId, sets
 *  originalTeamId if null (first trade for this slot preserves the original
 *  owner), writes a trades row with source='manual', and revalidates.
 *  Returns the new trade row. Caller must have admin or commissioner role. */
export async function recordManualTrade(input: {
  season: number;
  pickNumber: number;
  newTeamAbbreviation: string;
  tradeNote?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    throw new Error("Admin or commissioner only");
  }

  const season = input.season;
  const pickNumber = input.pickNumber;
  if (!Number.isInteger(pickNumber) || pickNumber < 1 || pickNumber > 32) {
    throw new Error("pickNumber must be 1–32");
  }

  const newAbbr = input.newTeamAbbreviation.trim().toUpperCase();
  const [newTeam] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.abbreviation, newAbbr));
  if (!newTeam) throw new Error(`Team not found: ${newAbbr}`);

  const [slot] = await db
    .select({
      id: draftOrder.id,
      teamId: draftOrder.teamId,
      originalTeamId: draftOrder.originalTeamId,
    })
    .from(draftOrder)
    .where(
      and(eq(draftOrder.season, season), eq(draftOrder.pickNumber, pickNumber))
    );
  if (!slot) throw new Error(`No draft_order row for #${pickNumber} in ${season}`);

  if (slot.teamId === newTeam.id) {
    throw new Error(`Pick #${pickNumber} is already owned by ${newAbbr}`);
  }

  const previousTeamId = slot.teamId;
  const trimmedNote = input.tradeNote?.trim() || null;

  await db
    .update(draftOrder)
    .set({
      teamId: newTeam.id,
      originalTeamId: slot.originalTeamId ?? previousTeamId,
      tradeNote: trimmedNote,
      updatedAt: new Date(),
    })
    .where(eq(draftOrder.id, slot.id));

  const [tradeRow] = await db
    .insert(trades)
    .values({
      season,
      pickNumber,
      previousTeamId,
      newTeamId: newTeam.id,
      tradeNote: trimmedNote,
      source: "manual",
    })
    .returning();

  revalidatePath("/admin");
  revalidatePath("/trades");
  revalidatePath("/mock-drafts");
  return tradeRow;
}

/** Reverses the most recent trade for a given slot: restores the previous
 *  team, and if this was the only trade, clears originalTeamId. Removes the
 *  trade row from the log. Admin only. */
export async function revertTrade(tradeId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Admin only");
  }

  const [t] = await db
    .select({
      id: trades.id,
      season: trades.season,
      pickNumber: trades.pickNumber,
      previousTeamId: trades.previousTeamId,
      newTeamId: trades.newTeamId,
    })
    .from(trades)
    .where(eq(trades.id, tradeId));
  if (!t) throw new Error("Trade not found");

  const remaining = await db
    .select({ id: trades.id })
    .from(trades)
    .where(
      and(
        eq(trades.season, t.season),
        eq(trades.pickNumber, t.pickNumber)
      )
    );
  const isOnlyTrade = remaining.length === 1;

  await db
    .update(draftOrder)
    .set({
      teamId: t.previousTeamId,
      originalTeamId: isOnlyTrade ? null : sql`${draftOrder.originalTeamId}`,
      tradeNote: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(draftOrder.season, t.season),
        eq(draftOrder.pickNumber, t.pickNumber)
      )
    );

  await db.delete(trades).where(eq(trades.id, tradeId));

  revalidatePath("/admin");
  revalidatePath("/trades");
  revalidatePath("/mock-drafts");
  return { ok: true };
}
