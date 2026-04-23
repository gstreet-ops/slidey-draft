CREATE TYPE "public"."trivia_round_status" AS ENUM('pending', 'active', 'paused', 'completed');
--> statement-breakpoint
CREATE TABLE "trivia_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"label" text,
	"category" text,
	"question_count" integer DEFAULT 10 NOT NULL,
	"timer_seconds" integer DEFAULT 20 NOT NULL,
	"is_lightning" boolean DEFAULT false NOT NULL,
	"point_multiplier" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "trivia_round_status" DEFAULT 'pending' NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"paused_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trivia_rounds" ADD CONSTRAINT "trivia_rounds_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pool_trivia_queue" ADD COLUMN "round_id" uuid;
--> statement-breakpoint
ALTER TABLE "pool_trivia_queue" ADD CONSTRAINT "pool_trivia_queue_round_id_trivia_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."trivia_rounds"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD COLUMN "point_multiplier" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE INDEX "trivia_rounds_pool_sort_idx" ON "trivia_rounds" ("pool_id", "sort_order");
--> statement-breakpoint
CREATE INDEX "pool_trivia_queue_round_idx" ON "pool_trivia_queue" ("round_id", "sort_order");
