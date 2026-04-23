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
export const userRoleEnum = pgEnum("user_role", ["admin", "commissioner", "user"]);
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
  favoriteTeamId: uuid("favorite_team_id").references(() => teams.id),
  /** True when an admin pre-created this account before the user has signed in.
      Cleared automatically on first Google sign-in via the NextAuth signIn callback. */
  isPreSeeded: boolean("is_pre_seeded").notNull().default(false),
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

// ── Groups (REMOVED — migrated to Pools) ──────────

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
  needs: jsonb("needs").$type<string[]>(),
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
  grade: integer("grade"),
  positionRank: integer("position_rank"),
  fortyTime: real("forty_time"),
  vertical: real("vertical"),
  benchPress: integer("bench_press"),
  broadJump: integer("broad_jump"),
  threeConeDrill: real("three_cone_drill"),
  shuttle: real("shuttle"),
  nflComparison: text("nfl_comparison"),
  schoolLogoUrl: text("school_logo_url"),
  consensusLow: integer("consensus_low"),
  consensusHigh: integer("consensus_high"),
  consensusMid: integer("consensus_mid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Draft Boards ───────────────────────────────────
export const draftBoards = pgTable(
  "draft_boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    season: integer("season").notNull(),
    title: text("title").notNull(),
    type: boardTypeEnum("type").notNull(),
    status: boardStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id),
    /** User's scoring entry draft for the season. Exactly one board per
        (createdBy, season) is marked true once the user has at least one board. */
    isEntryDraft: boolean("is_entry_draft").notNull().default(false),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("draft_boards_creator_season_entry_idx").on(
      table.createdBy,
      table.season,
      table.isEntryDraft
    ),
    index("draft_boards_season_status_idx").on(table.season, table.status),
  ]
);

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
    /** Team that originally held this pick before any trades. Stays null
        for slots that have never been traded. Set on first trade only; not
        overwritten on subsequent trades so we preserve the ORIGINAL owner. */
    originalTeamId: uuid("original_team_id").references(() => teams.id),
    /** Short summary of the most recent trade that affected this slot. */
    tradeNote: text("trade_note"),
    note: text("note"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("season_pick_idx").on(table.season, table.pickNumber)]
);

// ── Trades (audit log of draft-slot ownership changes) ──
export const tradeSourceEnum = pgEnum("trade_source", ["espn_sync", "manual"]);
export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    season: integer("season").notNull(),
    pickNumber: integer("pick_number").notNull(),
    previousTeamId: uuid("previous_team_id")
      .notNull()
      .references(() => teams.id),
    newTeamId: uuid("new_team_id")
      .notNull()
      .references(() => teams.id),
    tradeNote: text("trade_note"),
    source: tradeSourceEnum("source").notNull(),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("trades_season_detected_idx").on(table.season, table.detectedAt),
    index("trades_season_pick_idx").on(table.season, table.pickNumber),
  ]
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

// ── Commissioner Invites ─────────────────────────
export const commissionerInvites = pgTable("commissioner_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  usedBy: uuid("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  poolName: text("pool_name"),
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
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
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
    isAutoFilled: boolean("is_auto_filled").default(false),
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
    triviaTotal: integer("trivia_total").notNull().default(0),
    propTotal: integer("prop_total").notNull().default(0),
    combinedScore: integer("combined_score").notNull().default(0), // mock + live + trivia + props
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

// ── Enums (trivia) ───────────────────────────────
export const triviaDifficultyEnum = pgEnum("trivia_difficulty", [
  "easy",
  "medium",
  "hard",
]);
export const triviaQueueStatusEnum = pgEnum("trivia_queue_status", [
  "pending",
  "active",
  "completed",
]);

// ── Trivia Categories ────────────────────────────
export const triviaCategories = pgTable("trivia_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // display name, e.g. "NFL History"
  slug: text("slug").notNull().unique(), // kebab-case key, e.g. "nfl-history"
  color: text("color").notNull(), // hex color for the badge pill, e.g. "#3B82F6"
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Trivia Questions ─────────────────────────────
export const triviaQuestions = pgTable("trivia_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // array of 4 strings
  correctAnswer: integer("correct_answer").notNull(), // 0-indexed into options
  category: text("category").notNull(), // freetext: 'nfl_history', 'pop_culture', etc.
  difficulty: triviaDifficultyEnum("difficulty").notNull().default("medium"),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id), // null = system-seeded
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Pool Trivia Queue ────────────────────────────
export const poolTriviaQueue = pgTable(
  "pool_trivia_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => triviaQuestions.id),
    sortOrder: integer("sort_order").notNull(), // 1-indexed
    status: triviaQueueStatusEnum("status").notNull().default("pending"),
    activatedAt: timestamp("activated_at"),
    completedAt: timestamp("completed_at"),
    pickNumber: integer("pick_number"),
  },
  (table) => [
    uniqueIndex("pool_trivia_queue_question_idx").on(
      table.poolId,
      table.questionId
    ),
    uniqueIndex("pool_trivia_queue_order_idx").on(
      table.poolId,
      table.sortOrder
    ),
  ]
);

// ── Trivia Responses ─────────────────────────────
export const triviaResponses = pgTable(
  "trivia_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    questionId: uuid("question_id")
      .notNull()
      .references(() => triviaQuestions.id),
    pickNumber: integer("pick_number").notNull(),
    selectedAnswer: integer("selected_answer").notNull(), // 0-indexed into options
    isCorrect: boolean("is_correct").notNull(),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("trivia_response_unique_idx").on(
      table.poolId,
      table.userId,
      table.questionId
    ),
  ]
);

// ── Pool Invite Codes ────────────────────────────
export const poolInviteCodes = pgTable("pool_invite_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolId: uuid("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("single"), // 'single' | 'open'
  usedBy: uuid("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Pool Teams ───────────────────────────────────
export const poolTeams = pgTable("pool_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolId: uuid("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  colorHex: text("color_hex").notNull().default("#FFB612"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Chat Messages ────────────────────────────────
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(), // max 500 chars enforced at API level
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_pool_created_idx").on(table.poolId, table.createdAt),
  ]
);

// ── Pool Team Members ────────────────────────────
export const poolTeamMembers = pgTable(
  "pool_team_members",
  {
    poolTeamId: uuid("pool_team_id")
      .notNull()
      .references(() => poolTeams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.poolTeamId, table.userId] }),
  ]
);

// ── Enums (props) ────────────────────────────────
export const propTypeEnum = pgEnum('prop_type', [
  'over_under',
  'pick_player',
  'pick_team',
  'yes_no',
  'pick_number',
]);

export const propStatusEnum = pgEnum('prop_status', ['open', 'locked', 'resolved']);

// ── Props ────────────────────────────────────────
export const props = pgTable('props', {
  id: uuid('id').primaryKey().defaultRandom(),
  poolId: uuid('pool_id').references(() => pools.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  type: propTypeEnum('type').notNull(),
  options: jsonb('options'),
  correctAnswer: text('correct_answer'),
  points: integer('points').notNull().default(5),
  status: propStatusEnum('status').notNull().default('open'),
  category: text('category').notNull().default('general'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Prop Picks ───────────────────────────────────
export const propPicks = pgTable('prop_picks', {
  id: uuid('id').primaryKey().defaultRandom(),
  propId: uuid('prop_id').notNull().references(() => props.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  poolId: uuid('pool_id').notNull().references(() => pools.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  pointsAwarded: integer('points_awarded'),
  isCorrect: boolean('is_correct'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('prop_pick_unique_idx').on(table.propId, table.userId, table.poolId),
]);
