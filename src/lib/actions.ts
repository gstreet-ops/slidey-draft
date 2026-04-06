"use server";

import { db } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { draftBoards, picks, groups, groupMembers, actualResults, scores } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { scoreAllBoards } from "@/lib/scoring";

// ── Create a new mock draft board ──────────────────
export async function createBoard(formData: FormData) {
  const title = formData.get("title") as string;
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

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
  await db.delete(picks).where(eq(picks.id, pickId));
  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/my-board`);
  revalidatePath(`/picks/${boardId}`);
}

// ── Publish a board ────────────────────────────────
export async function publishBoard(boardId: string) {
  await db
    .update(draftBoards)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(draftBoards.id, boardId));

  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/my-board`);
  revalidatePath(`/picks/${boardId}`);
  revalidatePath("/picks");
}

// ── Create a group (admin only) ────────────────────
export async function createGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    throw new Error("Admin only");
  }

  const name = formData.get("name") as string;
  // Generate a short invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const [group] = await db
    .insert(groups)
    .values({
      name,
      inviteCode,
      createdBy: session.user.id,
    })
    .returning();

  // Auto-add admin to the group
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: session.user.id,
  });

  revalidatePath("/admin");
  return group;
}

// ── Enter an actual draft result (admin only) ─────
export async function enterActualResult(
  season: number,
  pickNumber: number,
  playerId: string,
  teamId: string
) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
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
    // Auto-score all published boards
    await scoreAllBoards(season, pickNumber, playerId, teamId);
  }

  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  return result;
}

// ── Undo last actual result (admin only) ───────────
export async function undoLastResult(season: number) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    throw new Error("Admin only");
  }

  // Find the most recent result
  const [last] = await db
    .select()
    .from(actualResults)
    .where(eq(actualResults.season, season))
    .orderBy(desc(actualResults.pickNumber))
    .limit(1);

  if (!last) return null;

  // Delete scores for this pick across all boards
  await db.delete(scores).where(eq(scores.pickNumber, last.pickNumber));

  // Delete the actual result
  await db.delete(actualResults).where(eq(actualResults.id, last.id));

  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  return last;
}

// ── Join a group ───────────────────────────────────
export async function joinGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db
    .insert(groupMembers)
    .values({
      groupId,
      userId: session.user.id,
    })
    .onConflictDoNothing();

  revalidatePath(`/group/${groupId}`);
}
