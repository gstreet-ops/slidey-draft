import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getConfig(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, key));
  return row?.value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function isDraftLocked(): Promise<boolean> {
  const val = await getConfig("draft_locked");
  return val === "true";
}
