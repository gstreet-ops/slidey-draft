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
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Enums ──────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const userStatusEnum = pgEnum("user_status", [
  "spectator",
  "active",
  "suspended",
]);
export const boardTypeEnum = pgEnum("board_type", ["mock", "actual"]);
export const boardStatusEnum = pgEnum("board_status", [
  "draft",
  "published",
  "locked",
  "final",
]);
export const poolStatusEnum = pgEnum("pool_status", [
  "open",
  "locked",
  "completed",
]);
export const poolMemberRoleEnum = pgEnum("pool_member_role", [
  "commissioner",
  "admin",
  "member",
]);

// ── Users ──────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: userRoleEnum("role").default("user"),
  status: userStatusEnum("status").notNull().default("spectator"),
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
  rank: integer("rank"),
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
    uniqueIndex("board_player_idx").on(table.boardId, table.playerId),
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
export const bpaRankings = pgTable(
  "bpa_rankings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    espnAthleteId: text("espn_athlete_id"),
    rank: integer("rank").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    index("bpa_rankings_player_idx").on(table.playerId),
  ]
);

// ── App Config ────────────────────────────────────
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── App Invites ───────────────────────────────────
export const appInvites = pgTable("app_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  claimedBy: uuid("claimed_by").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Pools ─────────────────────────────────────────
export const pools = pgTable("pools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  commissionerId: uuid("commissioner_id")
    .notNull()
    .references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  status: poolStatusEnum("status").notNull().default("open"),
  settings: jsonb("settings").notNull().default("{}"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Pool Members ──────────────────────────────────
export const poolMembers = pgTable(
  "pool_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: poolMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pool_member_idx").on(table.poolId, table.userId),
  ]
);

// ── Pool Announcements ────────────────────────────
export const poolAnnouncements = pgTable("pool_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolId: uuid("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Live Predictions ──────────────────────────────
export const livePredictions = pgTable(
  "live_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    pickNumber: integer("pick_number").notNull(),
    predictedPlayerId: uuid("predicted_player_id")
      .notNull()
      .references(() => players.id),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("live_pred_unique_idx").on(
      table.poolId,
      table.userId,
      table.pickNumber
    ),
  ]
);

// ── Live Scores ───────────────────────────────────
export const liveScores = pgTable(
  "live_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    pickNumber: integer("pick_number").notNull(),
    pointsAwarded: integer("points_awarded").notNull(),
    correct: boolean("correct").notNull(),
    scoredAt: timestamp("scored_at").defaultNow().notNull(),
  },
  (table) => [
    index("live_scores_pool_user_idx").on(table.poolId, table.userId),
  ]
);

// ── Mock Scores (per-pool tiered mock bonus) ──────
export const mockScores = pgTable(
  "mock_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => draftBoards.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    totalMockBonus: integer("total_mock_bonus").notNull().default(0),
    perPickBreakdown: jsonb("per_pick_breakdown"),
    scoredAt: timestamp("scored_at").defaultNow().notNull(),
  },
  (table) => [
    index("mock_scores_pool_user_idx").on(table.poolId, table.userId),
  ]
);

// ── Pool Standings (combined leaderboard) ─────────
export const poolStandings = pgTable(
  "pool_standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    mockBonus: integer("mock_bonus").notNull().default(0),
    liveTotal: integer("live_total").notNull().default(0),
    combinedScore: integer("combined_score").notNull().default(0),
    rank: integer("rank"),
    previousRank: integer("previous_rank"),
    picksPredicted: integer("picks_predicted").notNull().default(0),
    correctPredictions: integer("correct_predictions").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pool_standings_idx").on(table.poolId, table.userId),
  ]
);
