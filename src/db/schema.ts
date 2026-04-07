import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Enums ──────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const boardTypeEnum = pgEnum("board_type", ["mock", "actual"]);
export const boardStatusEnum = pgEnum("board_status", [
  "draft",
  "published",
  "locked",
  "final",
]);

// ── Users ──────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Auth.js tables ─────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ── Groups ─────────────────────────────────────────
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.userId] })]
);

// ── Teams ──────────────────────────────────────────
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull().unique(),
  conference: text("conference").notNull(),
  division: text("division").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
});

// ── Players (prospect pool) ────────────────────────
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  school: text("school").notNull(),
  height: text("height"),
  weight: integer("weight"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Draft Boards ───────────────────────────────────
export const draftBoards = pgTable("draft_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  season: integer("season").notNull(),
  title: text("title").notNull(),
  type: boardTypeEnum("type").notNull(),
  status: boardStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Draft Order (per-season slot assignments) ──────
export const draftOrder = pgTable(
  "draft_order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    season: integer("season").notNull(),
    pickNumber: integer("pick_number").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    note: text("note"),
  },
  (table) => [uniqueIndex("season_pick_idx").on(table.season, table.pickNumber)]
);

// ── Picks (a player picked at a slot on a board) ──
export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => draftBoards.id, { onDelete: "cascade" }),
    pickNumber: integer("pick_number").notNull(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    analysis: text("analysis"),
    confidence: integer("confidence"),
    autoFilled: boolean("auto_filled").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("board_pick_idx").on(table.boardId, table.pickNumber),
  ]
);

// ── Actual Results (Phase 2 — real draft picks) ────
export const actualResults = pgTable(
  "actual_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    season: integer("season").notNull(),
    pickNumber: integer("pick_number").notNull(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    tradedUp: boolean("traded_up").default(false),
    tradeDetails: jsonb("trade_details"),
    announcedAt: timestamp("announced_at"),
    espnAthleteId: text("espn_athlete_id"),
  },
  (table) => [
    uniqueIndex("actual_season_pick_idx").on(table.season, table.pickNumber),
  ]
);

// ── Scores (board-level summary) ──────────────────
export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => draftBoards.id, { onDelete: "cascade" })
    .unique(),
  userId: uuid("user_id").references(() => users.id),
  totalScore: integer("total_score").notNull().default(0),
  correctExact: integer("correct_exact").notNull().default(0),
  correctPlayer: integer("correct_player").notNull().default(0),
  accuracyPct: real("accuracy_pct").default(0),
  previousRank: integer("previous_rank"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Pick Scores (per-pick scoring breakdown) ──────
export const pickScores = pgTable(
  "pick_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => draftBoards.id, { onDelete: "cascade" }),
    pickNumber: integer("pick_number").notNull(),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    matchType: text("match_type").notNull(), // 'exact', 'close', 'far', 'miss'
    actualPlayerId: uuid("actual_player_id").references(() => players.id),
    scoredAt: timestamp("scored_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pick_scores_board_pick_idx").on(table.boardId, table.pickNumber),
  ]
);

// ── BPA Rankings ──────────────────────────────────
export const bpaRankings = pgTable("bpa_rankings", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  espnAthleteId: text("espn_athlete_id"),
  rank: integer("rank").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

// ── App Config ────────────────────────────────────
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
