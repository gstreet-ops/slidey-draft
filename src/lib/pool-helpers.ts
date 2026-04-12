import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { poolMembers, appInvites, pools } from "@/db/schema";

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

// ── Default pool settings ─────────────────────────

export const DEFAULT_POOL_SETTINGS = {
  rounds: [1],
  mockDraftBonus: true,
  livePredictions: true,
  trivia: true,
  watchParty: true,
  entryDeadline: null as string | null,
  maxMembers: null as number | null,
  scoringMode: "standard" as "standard" | "custom",
  mockPointValues: {
    playerCalled: 3,
    rangeClose: 2,
    rangeFar: 1,
    exactSlot: 5,
    positionMatch: 1,
  },
  livePointValues: {
    correctPlayer: 10,
  },
  triviaPointValues: {
    easy: 3,
    medium: 5,
    hard: 10,
  },
};

export type PoolSettings = typeof DEFAULT_POOL_SETTINGS;

/** Standard scoring defaults — used when scoringMode is "standard" */
export const STANDARD_SCORING = {
  mockPointValues: { ...DEFAULT_POOL_SETTINGS.mockPointValues },
  livePointValues: { ...DEFAULT_POOL_SETTINGS.livePointValues },
  triviaPointValues: { ...DEFAULT_POOL_SETTINGS.triviaPointValues },
} as const;

export function getPoolSettings(raw: unknown): PoolSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_POOL_SETTINGS };
  const merged = { ...DEFAULT_POOL_SETTINGS, ...(raw as Record<string, unknown>) } as PoolSettings;
  // Ensure triviaPointValues has the new tiered shape
  if (!merged.triviaPointValues || typeof merged.triviaPointValues !== "object" || !("easy" in merged.triviaPointValues)) {
    merged.triviaPointValues = { ...DEFAULT_POOL_SETTINGS.triviaPointValues };
  }
  // Default scoringMode to standard if missing
  if (!merged.scoringMode) merged.scoringMode = "standard";
  return merged;
}

/** Get effective scoring values — standard mode uses hardcoded defaults */
export function getEffectiveScoring(settings: PoolSettings) {
  if (settings.scoringMode === "standard") {
    return STANDARD_SCORING;
  }
  return {
    mockPointValues: settings.mockPointValues,
    livePointValues: settings.livePointValues,
    triviaPointValues: settings.triviaPointValues,
  };
}
