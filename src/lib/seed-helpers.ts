// Shared helpers for pre-seeding friend accounts. No "use server" — these are
// called from both the admin server action (with auth gating in front) and the
// db seed script (no auth needed).

import { db } from "@/db";
import { eq, and, asc, sql } from "drizzle-orm";
import {
  users,
  teams,
  pools,
  poolMembers,
  draftBoards,
  draftOrder,
  picks,
  players,
} from "@/db/schema";

export type PreSeedInput = {
  email: string;
  teamAbbreviation: string;
  nickname?: string;
  /** Pool to add the friend to. If omitted, the caller must resolve it. */
  poolId: string;
  /** Season for the auto-generated mock draft. Defaults to 2026. */
  season?: number;
};

export type PreSeedResult = {
  userId: string;
  boardId: string;
  alreadyExisted: boolean;
  alreadyInPool: boolean;
  picksFilled: number;
};

/** Fill a board with the highest-ranked available prospects. Idempotent — only
 *  fills empty slots, leaves existing picks alone. */
export async function fillBoardWithBPA(boardId: string): Promise<number> {
  const [board] = await db
    .select({ season: draftBoards.season })
    .from(draftBoards)
    .where(eq(draftBoards.id, boardId));
  if (!board) throw new Error("Board not found");

  const slots = await db
    .select()
    .from(draftOrder)
    .where(eq(draftOrder.season, board.season))
    .orderBy(asc(draftOrder.pickNumber));

  const existing = await db
    .select({ pickNumber: picks.pickNumber, playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.boardId, boardId));

  const pickedNumbers = new Set(existing.map((p) => p.pickNumber));
  const usedPlayerIds = new Set(existing.map((p) => p.playerId));

  const emptySlots = slots.filter((s) => !pickedNumbers.has(s.pickNumber));
  if (emptySlots.length === 0) return 0;

  const rankedPlayers = await db
    .select({ id: players.id, rank: players.rank })
    .from(players)
    .where(sql`${players.rank} IS NOT NULL`)
    .orderBy(asc(players.rank));

  let filled = 0;
  for (const slot of emptySlots) {
    const next = rankedPlayers.find((p) => !usedPlayerIds.has(p.id));
    if (!next) break;
    await db.insert(picks).values({
      boardId,
      pickNumber: slot.pickNumber,
      playerId: next.id,
      teamId: slot.teamId,
      autoFilled: true,
    });
    usedPlayerIds.add(next.id);
    filled++;
  }
  return filled;
}

/** Idempotent core pre-seed: creates user (or reuses existing by email),
 *  adds them to the pool, generates a default mock draft. Safe to re-run. */
export async function preSeedUserCore(input: PreSeedInput): Promise<PreSeedResult> {
  const season = input.season ?? 2026;
  const email = input.email.trim().toLowerCase();
  const teamAbbr = input.teamAbbreviation.trim().toUpperCase();

  // 1. Resolve team
  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.abbreviation, teamAbbr));
  if (!team) throw new Error(`Team not found: ${teamAbbr}`);

  // 2. Resolve pool
  const [pool] = await db
    .select({ id: pools.id })
    .from(pools)
    .where(eq(pools.id, input.poolId));
  if (!pool) throw new Error("Pool not found");

  // 3. Find or create user
  const [existing] = await db
    .select({ id: users.id, isPreSeeded: users.isPreSeeded })
    .from(users)
    .where(eq(users.email, email));

  let userId: string;
  let alreadyExisted = false;

  if (existing) {
    userId = existing.id;
    alreadyExisted = true;
    // Keep existing user; just make sure team is set if missing
    await db
      .update(users)
      .set({
        favoriteTeamId: team.id,
        ...(input.nickname ? { name: input.nickname } : {}),
      })
      .where(eq(users.id, userId));
  } else {
    const derivedName = input.nickname?.trim() || email.split("@")[0];
    const [created] = await db
      .insert(users)
      .values({
        email,
        name: derivedName,
        favoriteTeamId: team.id,
        role: "user",
        status: "active",
        isPreSeeded: true,
      })
      .returning({ id: users.id });
    userId = created.id;
  }

  // 4. Add to pool (idempotent — onConflictDoNothing on the unique idx)
  const beforeMember = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .where(and(eq(poolMembers.poolId, pool.id), eq(poolMembers.userId, userId)));
  const alreadyInPool = beforeMember.length > 0;
  if (!alreadyInPool) {
    await db.insert(poolMembers).values({
      poolId: pool.id,
      userId,
      role: "member",
    });
  }

  // 5. Find or create their mock draft board for this season
  const [existingBoard] = await db
    .select({ id: draftBoards.id })
    .from(draftBoards)
    .where(and(eq(draftBoards.createdBy, userId), eq(draftBoards.season, season)));

  let boardId: string;
  if (existingBoard) {
    boardId = existingBoard.id;
  } else {
    const userName = input.nickname?.trim() || email.split("@")[0];
    const [board] = await db
      .insert(draftBoards)
      .values({
        title: `${userName}'s Mock Draft`,
        season,
        type: "mock",
        status: "draft",
        createdBy: userId,
        isEntryDraft: true,
      })
      .returning({ id: draftBoards.id });
    boardId = board.id;
  }

  // 6. Auto-fill any empty pick slots with consensus rankings
  const picksFilled = await fillBoardWithBPA(boardId);

  return { userId, boardId, alreadyExisted, alreadyInPool, picksFilled };
}
