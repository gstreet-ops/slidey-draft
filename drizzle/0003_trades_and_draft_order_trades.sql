CREATE TYPE "public"."trade_source" AS ENUM('espn_sync', 'manual');--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" integer NOT NULL,
	"pick_number" integer NOT NULL,
	"previous_team_id" uuid NOT NULL,
	"new_team_id" uuid NOT NULL,
	"trade_note" text,
	"source" "trade_source" NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_order" ADD COLUMN "original_team_id" uuid;--> statement-breakpoint
ALTER TABLE "draft_order" ADD COLUMN "trade_note" text;--> statement-breakpoint
ALTER TABLE "draft_order" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_previous_team_id_teams_id_fk" FOREIGN KEY ("previous_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_new_team_id_teams_id_fk" FOREIGN KEY ("new_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_order" ADD CONSTRAINT "draft_order_original_team_id_teams_id_fk" FOREIGN KEY ("original_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;