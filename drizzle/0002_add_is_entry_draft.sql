ALTER TABLE "draft_boards" ADD COLUMN "is_entry_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: for each (created_by, season) pair, mark the most recently created
-- mock board as the entry draft. Admin-owned boards (createdBy NULL) are skipped.
UPDATE "draft_boards"
SET "is_entry_draft" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("created_by", "season") "id"
  FROM "draft_boards"
  WHERE "created_by" IS NOT NULL AND "type" = 'mock'
  ORDER BY "created_by", "season", "created_at" DESC
);
