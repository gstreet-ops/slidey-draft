import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { players, appConfig } from "@/db/schema";
import { sql, isNull } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const log: string[] = [];

  try {
    // ── Fix 1: Deduplicate players ─────────────────────
    // For each duplicate name, keep the row with the highest grade, delete the rest
    // Only delete rows not referenced in picks, actual_results, pick_scores, or bpa_rankings
    const deleteResult = await db.execute(sql`
      WITH dupes AS (
        SELECT id, name, grade,
          ROW_NUMBER() OVER (PARTITION BY name ORDER BY grade DESC NULLS LAST, created_at DESC) as rn
        FROM players
      ),
      to_delete AS (
        SELECT d.id FROM dupes d
        WHERE d.rn > 1
          AND d.id NOT IN (SELECT player_id FROM picks WHERE player_id IS NOT NULL)
          AND d.id NOT IN (SELECT player_id FROM actual_results WHERE player_id IS NOT NULL)
          AND d.id NOT IN (SELECT actual_player_id FROM pick_scores WHERE actual_player_id IS NOT NULL)
          AND d.id NOT IN (SELECT player_id FROM bpa_rankings)
          AND d.id NOT IN (SELECT predicted_player_id FROM live_predictions WHERE predicted_player_id IS NOT NULL)
      )
      DELETE FROM players WHERE id IN (SELECT id FROM to_delete)
    `);
    log.push(`Dedup: deleted ${deleteResult.rowCount ?? 'unknown number of'} duplicate players`);

    // Fix remaining duplicates: migrate picks to the enriched copy, then delete stale copy
    const remainingDupes = await db.execute(sql`
      WITH dupes AS (
        SELECT id, name, grade,
          ROW_NUMBER() OVER (PARTITION BY name ORDER BY grade DESC NULLS LAST, created_at DESC) as rn
        FROM players
      )
      SELECT
        keep.id as keep_id, del.id as delete_id, keep.name
      FROM dupes keep
      JOIN dupes del ON keep.name = del.name AND keep.rn = 1 AND del.rn > 1
    `);
    const toMigrate = (remainingDupes.rows ?? remainingDupes) as { keep_id: string; delete_id: string; name: string }[];

    if (toMigrate.length > 0) {
      for (const { keep_id, delete_id, name } of toMigrate) {
        // Update picks to point to the enriched player
        // Handle unique constraint (boardId, playerId) — if the board already has the keep player, delete the stale pick
        await db.execute(sql`
          DELETE FROM picks
          WHERE player_id = ${delete_id}::uuid
            AND board_id IN (
              SELECT board_id FROM picks WHERE player_id = ${keep_id}::uuid
            )
        `);
        await db.execute(sql`
          UPDATE picks SET player_id = ${keep_id}::uuid WHERE player_id = ${delete_id}::uuid
        `);
        // Also update actual_results, pick_scores, bpa_rankings
        await db.execute(sql`UPDATE actual_results SET player_id = ${keep_id}::uuid WHERE player_id = ${delete_id}::uuid`);
        await db.execute(sql`UPDATE pick_scores SET actual_player_id = ${keep_id}::uuid WHERE actual_player_id = ${delete_id}::uuid`);
        await db.execute(sql`UPDATE bpa_rankings SET player_id = ${keep_id}::uuid WHERE player_id = ${delete_id}::uuid`);
        await db.execute(sql`
          DELETE FROM live_predictions
          WHERE predicted_player_id = ${delete_id}::uuid
            AND (pool_id, user_id, pick_number) IN (
              SELECT pool_id, user_id, pick_number FROM live_predictions WHERE predicted_player_id = ${keep_id}::uuid
            )
        `);
        await db.execute(sql`UPDATE live_predictions SET predicted_player_id = ${keep_id}::uuid WHERE predicted_player_id = ${delete_id}::uuid`);
        // Now safe to delete
        await db.execute(sql`DELETE FROM players WHERE id = ${delete_id}::uuid`);
      }
      log.push(`Migrated picks and deleted ${toMigrate.length} remaining duplicates: ${toMigrate.map(r => r.name).join(', ')}`);
    }

    // Final dupe check
    const finalDupes = await db.execute(sql`
      SELECT name, COUNT(*) as cnt FROM players GROUP BY name HAVING COUNT(*) > 1
    `);
    const finalRemaining = (finalDupes.rows ?? finalDupes) as { name: string }[];
    if (finalRemaining.length > 0) {
      log.push(`WARNING: ${finalRemaining.length} duplicate names still remain`);
    }

    // ── Fix 2: Enrich remaining players missing grades/comparisons ──
    const unenriched = await db.select({ id: players.id, name: players.name })
      .from(players)
      .where(isNull(players.grade));

    if (unenriched.length > 0) {
      // These players were never in the scouting map — assign floor grades
      await db.execute(sql`
        UPDATE players
        SET grade = 55,
            position_rank = 99,
            nfl_comparison = 'Camp Body / UDFA'
        WHERE grade IS NULL
      `);
      log.push(`Assigned default grades to ${unenriched.length} unenriched players: ${unenriched.map(p => p.name).join(', ')}`);
    } else {
      log.push("No players missing grades after dedup");
    }

    // ── Fix 3: Reset failed sync status ──────────────
    const configRows = await db.select().from(appConfig);
    const configMap = Object.fromEntries(configRows.map(r => [r.key, r.value]));
    log.push(`last_sync_status was: ${configMap["last_sync_status"]}`);
    log.push(`last_sync_at was: ${configMap["last_sync_at"]}`);

    await db.execute(sql`
      UPDATE app_config SET value = 'pending', updated_at = NOW() WHERE key = 'last_sync_status'
    `);
    log.push("Reset last_sync_status to 'pending'");

    // ── Final counts ─────────────────────────────────
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(players);
    const [{ nullGrades }] = await db.select({ nullGrades: sql<number>`count(*)` })
      .from(players)
      .where(isNull(players.grade));

    log.push(`Final player count: ${total}`);
    log.push(`Players still missing grades: ${nullGrades}`);

    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json(
      { error: "Fix failed", details: String(error), log },
      { status: 500 }
    );
  }
}
