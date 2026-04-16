import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  players,
  draftOrder,
  draftBoards,
  picks,
  pools,
  poolMembers,
  users,
  appConfig,
} from "@/db/schema";
import { sql, eq, isNull, count, and, gt, lt, gte, lte, not, inArray } from "drizzle-orm";

const SEASON = 2026;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const issues: { severity: "critical" | "warning"; message: string }[] = [];

  try {
    // ── Players / Prospects ──────────────────────────
    const [{ total: playerCount }] = await db
      .select({ total: count() })
      .from(players);

    const missingRequired = await db
      .select({ id: players.id, name: players.name })
      .from(players)
      .where(
        sql`${players.name} IS NULL OR ${players.position} IS NULL OR ${players.school} IS NULL`
      );

    const duplicateNames = await db.execute(
      sql`SELECT name, COUNT(*) as cnt FROM players GROUP BY name HAVING COUNT(*) > 1`
    );

    const gradeDistribution = await db.execute(sql`
      SELECT
        CASE
          WHEN grade >= 90 THEN '90+'
          WHEN grade >= 80 THEN '80-89'
          WHEN grade >= 70 THEN '70-79'
          WHEN grade >= 60 THEN '60-69'
          WHEN grade < 60 THEN '<60'
          ELSE 'null'
        END AS tier,
        COUNT(*) AS cnt
      FROM players
      GROUP BY tier
      ORDER BY tier
    `);

    const [{ total: missingGrades }] = await db
      .select({ total: count() })
      .from(players)
      .where(isNull(players.grade));

    const [{ total: missingComparisons }] = await db
      .select({ total: count() })
      .from(players)
      .where(isNull(players.nflComparison));

    if (playerCount !== 250)
      issues.push({ severity: "warning", message: `Player count is ${playerCount}, expected 250` });
    if (missingRequired.length > 0)
      issues.push({ severity: "critical", message: `${missingRequired.length} players missing required fields` });
    if (missingGrades > 0)
      issues.push({ severity: "warning", message: `${missingGrades} players missing grades` });
    if (missingComparisons > 0)
      issues.push({ severity: "warning", message: `${missingComparisons} players missing NFL comparisons` });

    results.players = {
      totalCount: playerCount,
      missingRequiredFields: missingRequired,
      duplicateNames: duplicateNames.rows ?? duplicateNames,
      gradeDistribution: gradeDistribution.rows ?? gradeDistribution,
      missingGrades,
      missingComparisons,
    };

    // ── Draft Order ──────────────────────────────────
    const [{ total: draftSlots }] = await db
      .select({ total: count() })
      .from(draftOrder)
      .where(eq(draftOrder.season, SEASON));

    const missingTeams = await db
      .select()
      .from(draftOrder)
      .where(and(eq(draftOrder.season, SEASON), isNull(draftOrder.teamId)));

    const duplicatePicks = await db.execute(sql`
      SELECT pick_number, COUNT(*) as cnt
      FROM draft_order
      WHERE season = ${SEASON}
      GROUP BY pick_number
      HAVING COUNT(*) > 1
    `);

    if (draftSlots !== 32)
      issues.push({ severity: "warning", message: `Draft order has ${draftSlots} slots, expected 32` });
    if (missingTeams.length > 0)
      issues.push({ severity: "critical", message: `${missingTeams.length} draft slots missing team assignment` });

    results.draftOrder = {
      totalSlots: draftSlots,
      missingTeamAssignments: missingTeams.length,
      duplicatePickNumbers: duplicatePicks.rows ?? duplicatePicks,
    };

    // ── Boards ───────────────────────────────────────
    const [{ total: boardCount }] = await db.select({ total: count() }).from(draftBoards);

    const boardsByStatus = await db.execute(sql`
      SELECT status, COUNT(*) as cnt FROM draft_boards GROUP BY status
    `);

    const oversizedBoards = await db.execute(sql`
      SELECT board_id, COUNT(*) as pick_count
      FROM picks
      GROUP BY board_id
      HAVING COUNT(*) > 32
    `);

    const orphanedPicksPlayers = await db.execute(sql`
      SELECT p.board_id, p.pick_number, p.player_id
      FROM picks p
      LEFT JOIN players pl ON p.player_id = pl.id
      WHERE pl.id IS NULL AND p.player_id IS NOT NULL
    `);

    const orphanedPicksBoards = await db.execute(sql`
      SELECT p.board_id, p.pick_number
      FROM picks p
      LEFT JOIN draft_boards b ON p.board_id = b.id
      WHERE b.id IS NULL
    `);

    const oversizedRows = oversizedBoards.rows ?? oversizedBoards;
    const orphanedPlayerRows = orphanedPicksPlayers.rows ?? orphanedPicksPlayers;
    const orphanedBoardRows = orphanedPicksBoards.rows ?? orphanedPicksBoards;

    if ((oversizedRows as unknown[]).length > 0)
      issues.push({ severity: "critical", message: `${(oversizedRows as unknown[]).length} boards have >32 picks` });
    if ((orphanedPlayerRows as unknown[]).length > 0)
      issues.push({ severity: "critical", message: `${(orphanedPlayerRows as unknown[]).length} picks reference non-existent players` });
    if ((orphanedBoardRows as unknown[]).length > 0)
      issues.push({ severity: "critical", message: `${(orphanedBoardRows as unknown[]).length} picks reference non-existent boards` });

    results.boards = {
      totalCount: boardCount,
      byStatus: boardsByStatus.rows ?? boardsByStatus,
      oversizedBoards: oversizedRows,
      orphanedPicks: {
        referencingMissingPlayers: orphanedPlayerRows,
        referencingMissingBoards: orphanedBoardRows,
      },
    };

    // ── Pools ────────────────────────────────────────
    const [{ total: poolCount }] = await db.select({ total: count() }).from(pools);

    const emptyPools = await db.execute(sql`
      SELECT p.id, p.name
      FROM pools p
      LEFT JOIN pool_members pm ON p.id = pm.pool_id
      GROUP BY p.id, p.name
      HAVING COUNT(pm.user_id) = 0
    `);

    const orphanedMembers = await db.execute(sql`
      SELECT pm.pool_id, pm.user_id
      FROM pool_members pm
      LEFT JOIN users u ON pm.user_id = u.id
      WHERE u.id IS NULL
    `);

    const poolsWithoutCommissioner = await db.execute(sql`
      SELECT p.id, p.name
      FROM pools p
      WHERE NOT EXISTS (
        SELECT 1 FROM pool_members pm
        WHERE pm.pool_id = p.id AND pm.role = 'commissioner'
      )
    `);

    const emptyPoolRows = emptyPools.rows ?? emptyPools;
    const orphanedMemberRows = orphanedMembers.rows ?? orphanedMembers;
    const noCommRows = poolsWithoutCommissioner.rows ?? poolsWithoutCommissioner;

    if ((emptyPoolRows as unknown[]).length > 0)
      issues.push({ severity: "critical", message: `${(emptyPoolRows as unknown[]).length} pools have 0 members` });
    if ((orphanedMemberRows as unknown[]).length > 0)
      issues.push({ severity: "critical", message: `${(orphanedMemberRows as unknown[]).length} pool members reference non-existent users` });
    if ((noCommRows as unknown[]).length > 0)
      issues.push({ severity: "warning", message: `${(noCommRows as unknown[]).length} pools have no commissioner member` });

    results.pools = {
      totalCount: poolCount,
      emptyPools: emptyPoolRows,
      orphanedMembers: orphanedMemberRows,
      poolsWithoutCommissioner: noCommRows,
    };

    // ── Users ────────────────────────────────────────
    const [{ total: userCount }] = await db.select({ total: count() }).from(users);

    const usersByRole = await db.execute(sql`
      SELECT role, COUNT(*) as cnt FROM users GROUP BY role
    `);

    const usersByStatus = await db.execute(sql`
      SELECT status, COUNT(*) as cnt FROM users GROUP BY status
    `);

    results.users = {
      totalCount: userCount,
      byRole: usersByRole.rows ?? usersByRole,
      byStatus: usersByStatus.rows ?? usersByStatus,
    };

    // ── App Config ───────────────────────────────────
    const configRows = await db.select().from(appConfig);
    const configMap = Object.fromEntries(configRows.map((r) => [r.key, r.value]));

    const expectedKeys = ["draft_locked"];
    const missingKeys = expectedKeys.filter((k) => !(k in configMap));

    if (missingKeys.length > 0)
      issues.push({ severity: "warning", message: `Missing config keys: ${missingKeys.join(", ")}` });

    results.appConfig = {
      values: configMap,
      missingExpectedKeys: missingKeys,
    };

    // ── Summary ──────────────────────────────────────
    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    return NextResponse.json({
      status: criticalCount > 0 ? "FAIL" : warningCount > 0 ? "WARN" : "PASS",
      summary: { critical: criticalCount, warnings: warningCount },
      issues,
      results,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Integrity check failed", details: String(error) },
      { status: 500 }
    );
  }
}
