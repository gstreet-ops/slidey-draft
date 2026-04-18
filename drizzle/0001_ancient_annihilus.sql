CREATE TYPE "public"."prop_status" AS ENUM('open', 'locked', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."prop_type" AS ENUM('over_under', 'pick_player', 'pick_team', 'yes_no', 'pick_number');--> statement-breakpoint
CREATE TABLE "prop_picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pool_id" uuid NOT NULL,
	"answer" text NOT NULL,
	"points_awarded" integer,
	"is_correct" boolean,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "props" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid,
	"question" text NOT NULL,
	"type" "prop_type" NOT NULL,
	"options" jsonb,
	"correct_answer" text,
	"points" integer DEFAULT 5 NOT NULL,
	"status" "prop_status" DEFAULT 'open' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pool_teams" ALTER COLUMN "color_hex" SET DEFAULT '#FFB612';--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "consensus_low" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "consensus_high" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "consensus_mid" integer;--> statement-breakpoint
ALTER TABLE "pool_standings" ADD COLUMN "prop_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "needs" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_pre_seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prop_picks" ADD CONSTRAINT "prop_picks_prop_id_props_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."props"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop_picks" ADD CONSTRAINT "prop_picks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop_picks" ADD CONSTRAINT "prop_picks_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prop_pick_unique_idx" ON "prop_picks" USING btree ("prop_id","user_id","pool_id");