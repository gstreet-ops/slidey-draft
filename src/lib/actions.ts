"use server";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import { draftBoards, picks } from "@/db/schema";
import { revalidatePath } from "next/cache";

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
  revalidatePath(`/picks/${boardId}`);
  return pick;
}

// ── Remove a pick ──────────────────────────────────
export async function removePick(pickId: string, boardId: string) {
  await db.delete(picks).where(eq(picks.id, pickId));
  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/picks/${boardId}`);
}

// ── Publish a board ────────────────────────────────
export async function publishBoard(boardId: string) {
  await db
    .update(draftBoards)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(draftBoards.id, boardId));

  revalidatePath(`/admin/board/${boardId}`);
  revalidatePath(`/picks/${boardId}`);
  revalidatePath("/picks");
}
