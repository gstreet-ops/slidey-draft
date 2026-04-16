CREATE TYPE "public"."board_status" AS ENUM('draft', 'published', 'locked', 'final');--> statement-breakpoint
CREATE TYPE "public"."board_type" AS ENUM('mock', 'actual');--> statement-breakpoint
CREATE TYPE "public"."pool_member_role" AS ENUM('commissioner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."pool_status" AS ENUM('open', 'locked', 'completed');--> statement-breakpoint
CREATE TYPE "public"."trivia_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."trivia_queue_status" AS ENUM('pending', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'commissioner', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('spectator', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "actual_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" integer NOT NULL,
	"pick_number" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"traded_up" boolean DEFAULT false,
	"trade_details" jsonb,
	"announced_at" timestamp,
	"espn_athlete_id" text
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"created_by" uuid NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "bpa_rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"espn_athlete_id" text,
	"rank" integer NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissioner_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"created_by" uuid NOT NULL,
	"used_by" uuid,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"pool_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commissioner_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "draft_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" integer NOT NULL,
	"title" text NOT NULL,
	"type" "board_type" NOT NULL,
	"status" "board_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" integer NOT NULL,
	"pick_number" integer NOT NULL,
	"team_id" uuid NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "live_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pick_number" integer NOT NULL,
	"predicted_player_id" uuid NOT NULL,
	"is_auto_filled" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pick_number" integer NOT NULL,
	"points_awarded" integer NOT NULL,
	"correct" boolean NOT NULL,
	"scored_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_mock_bonus" integer DEFAULT 0 NOT NULL,
	"per_pick_breakdown" jsonb,
	"scored_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pick_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"pick_number" integer NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"match_type" text NOT NULL,
	"actual_player_id" uuid,
	"scored_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"pick_number" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"analysis" text,
	"confidence" integer,
	"auto_filled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"school" text NOT NULL,
	"height" text,
	"weight" integer,
	"image_url" text,
	"notes" text,
	"rank" integer,
	"grade" integer,
	"position_rank" integer,
	"forty_time" real,
	"vertical" real,
	"bench_press" integer,
	"broad_jump" integer,
	"three_cone_drill" real,
	"shuttle" real,
	"nfl_comparison" text,
	"school_logo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'single' NOT NULL,
	"used_by" uuid,
	"used_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pool_invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pool_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "pool_member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mock_bonus" integer DEFAULT 0 NOT NULL,
	"live_total" integer DEFAULT 0 NOT NULL,
	"trivia_total" integer DEFAULT 0 NOT NULL,
	"combined_score" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"previous_rank" integer,
	"picks_predicted" integer DEFAULT 0 NOT NULL,
	"correct_predictions" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_team_members" (
	"pool_team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "pool_team_members_pool_team_id_user_id_pk" PRIMARY KEY("pool_team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "pool_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color_hex" text DEFAULT '#4A7AB5' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_trivia_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"status" "trivia_queue_status" DEFAULT 'pending' NOT NULL,
	"activated_at" timestamp,
	"completed_at" timestamp,
	"pick_number" integer
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"commissioner_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"status" "pool_status" DEFAULT 'open' NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"description" text,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pools_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" uuid,
	"total_score" integer DEFAULT 0 NOT NULL,
	"correct_exact" integer DEFAULT 0 NOT NULL,
	"correct_player" integer DEFAULT 0 NOT NULL,
	"accuracy_pct" real DEFAULT 0,
	"previous_rank" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scores_board_id_unique" UNIQUE("board_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"conference" text NOT NULL,
	"division" text NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	CONSTRAINT "teams_abbreviation_unique" UNIQUE("abbreviation")
);
--> statement-breakpoint
CREATE TABLE "trivia_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" integer NOT NULL,
	"category" text NOT NULL,
	"difficulty" "trivia_difficulty" DEFAULT 'medium' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trivia_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"pick_number" integer NOT NULL,
	"selected_answer" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"role" "user_role" DEFAULT 'user',
	"status" "user_status" DEFAULT 'spectator' NOT NULL,
	"favorite_team_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_results" ADD CONSTRAINT "actual_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_results" ADD CONSTRAINT "actual_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_invites" ADD CONSTRAINT "app_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_invites" ADD CONSTRAINT "app_invites_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bpa_rankings" ADD CONSTRAINT "bpa_rankings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissioner_invites" ADD CONSTRAINT "commissioner_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissioner_invites" ADD CONSTRAINT "commissioner_invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_boards" ADD CONSTRAINT "draft_boards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_order" ADD CONSTRAINT "draft_order_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_predictions" ADD CONSTRAINT "live_predictions_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_predictions" ADD CONSTRAINT "live_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_predictions" ADD CONSTRAINT "live_predictions_predicted_player_id_players_id_fk" FOREIGN KEY ("predicted_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_scores" ADD CONSTRAINT "live_scores_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_scores" ADD CONSTRAINT "live_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_scores" ADD CONSTRAINT "mock_scores_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_scores" ADD CONSTRAINT "mock_scores_board_id_draft_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."draft_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_scores" ADD CONSTRAINT "mock_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_scores" ADD CONSTRAINT "pick_scores_board_id_draft_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."draft_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_scores" ADD CONSTRAINT "pick_scores_actual_player_id_players_id_fk" FOREIGN KEY ("actual_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_board_id_draft_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."draft_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_announcements" ADD CONSTRAINT "pool_announcements_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_announcements" ADD CONSTRAINT "pool_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_invite_codes" ADD CONSTRAINT "pool_invite_codes_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_invite_codes" ADD CONSTRAINT "pool_invite_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_standings" ADD CONSTRAINT "pool_standings_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_standings" ADD CONSTRAINT "pool_standings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_team_members" ADD CONSTRAINT "pool_team_members_pool_team_id_pool_teams_id_fk" FOREIGN KEY ("pool_team_id") REFERENCES "public"."pool_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_team_members" ADD CONSTRAINT "pool_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_teams" ADD CONSTRAINT "pool_teams_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_trivia_queue" ADD CONSTRAINT "pool_trivia_queue_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_trivia_queue" ADD CONSTRAINT "pool_trivia_queue_question_id_trivia_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."trivia_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_commissioner_id_users_id_fk" FOREIGN KEY ("commissioner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_board_id_draft_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."draft_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_questions" ADD CONSTRAINT "trivia_questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD CONSTRAINT "trivia_responses_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD CONSTRAINT "trivia_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_responses" ADD CONSTRAINT "trivia_responses_question_id_trivia_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."trivia_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_favorite_team_id_teams_id_fk" FOREIGN KEY ("favorite_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actual_season_pick_idx" ON "actual_results" USING btree ("season","pick_number");--> statement-breakpoint
CREATE INDEX "bpa_rankings_player_idx" ON "bpa_rankings" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "chat_messages_pool_created_idx" ON "chat_messages" USING btree ("pool_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "season_pick_idx" ON "draft_order" USING btree ("season","pick_number");--> statement-breakpoint
CREATE UNIQUE INDEX "live_pred_unique_idx" ON "live_predictions" USING btree ("pool_id","user_id","pick_number");--> statement-breakpoint
CREATE INDEX "live_scores_pool_user_idx" ON "live_scores" USING btree ("pool_id","user_id");--> statement-breakpoint
CREATE INDEX "mock_scores_pool_user_idx" ON "mock_scores" USING btree ("pool_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pick_scores_board_pick_idx" ON "pick_scores" USING btree ("board_id","pick_number");--> statement-breakpoint
CREATE UNIQUE INDEX "board_pick_idx" ON "picks" USING btree ("board_id","pick_number");--> statement-breakpoint
CREATE UNIQUE INDEX "board_player_idx" ON "picks" USING btree ("board_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_member_idx" ON "pool_members" USING btree ("pool_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_standings_idx" ON "pool_standings" USING btree ("pool_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_trivia_queue_question_idx" ON "pool_trivia_queue" USING btree ("pool_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_trivia_queue_order_idx" ON "pool_trivia_queue" USING btree ("pool_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "trivia_response_unique_idx" ON "trivia_responses" USING btree ("pool_id","user_id","question_id");