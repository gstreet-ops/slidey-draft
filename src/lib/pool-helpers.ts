import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { poolMembers, appInvites, pools } from "@/db/schema";

// Re-export client-safe settings so existing server-side imports keep working
export {
  DEFAULT_POOL_SETTINGS,
  STANDARD_SCORING,
  getPoolSettings,
  getEffectiveScoring,
} from "@/lib/pool-settings";
export type { PoolSettings } from "@/lib/pool-settings";

// ── Pool role helpers ─────────────────────────────

export type PoolRole = "commissioner" | "admin" | "member" | null;

export async function getPoolRole(
  userId: string,
  poolId: string
): Promise<PoolRole> {
  const [member] = await db
    .select({ role: poolMembers.role })
    .from(poolMembers)
    .where(
      and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId))
    );
  return (member?.role as PoolRole) ?? null;
}

export async function canManagePool(
  userId: string,
  poolId: string
): Promise<boolean> {
  const role = await getPoolRole(userId, poolId);
  return role === "commissioner" || role === "admin";
}

// ── Code generation ───────────────────────────────

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function generateCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

export async function generateAppInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode(8);
    const [existing] = await db
      .select({ id: appInvites.id })
      .from(appInvites)
      .where(eq(appInvites.code, code));
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique invite code");
}

export async function generatePoolInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode(6);
    const [existing] = await db
      .select({ id: pools.id })
      .from(pools)
      .where(eq(pools.inviteCode, code));
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique pool invite code");
}
