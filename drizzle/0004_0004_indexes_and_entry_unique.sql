CREATE INDEX "draft_boards_creator_season_entry_idx" ON "draft_boards" USING btree ("created_by","season","is_entry_draft");--> statement-breakpoint
CREATE INDEX "draft_boards_season_status_idx" ON "draft_boards" USING btree ("season","status");--> statement-breakpoint
CREATE INDEX "trades_season_detected_idx" ON "trades" USING btree ("season","detected_at");--> statement-breakpoint
CREATE INDEX "trades_season_pick_idx" ON "trades" USING btree ("season","pick_number");--> statement-breakpoint
-- Partial unique index: at most one entry draft per user per season.
-- Enforces the invariant that setEntryBoard relies on, even under concurrent writes.
CREATE UNIQUE INDEX "draft_boards_entry_per_user_season"
  ON "draft_boards" ("created_by", "season")
  WHERE "is_entry_draft" AND "created_by" IS NOT NULL;