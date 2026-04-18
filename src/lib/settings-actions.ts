"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function updateDisplayName(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Display name cannot be empty");
  if (trimmed.length > 80) throw new Error("Display name must be 80 characters or fewer");

  await db.update(users).set({ name: trimmed }).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true, name: trimmed };
}

export async function updateFavoriteTeam(teamId: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db
    .update(users)
    .set({ favoriteTeamId: teamId })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  return { success: true };
}
