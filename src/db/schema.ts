import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("user"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  },
  (table) => [
    uniqueIndex("actual_season_pick_idx").on(table.season, table.pickNumber),
  ]
);

// ── Scores (Phase 3 — how accurate was each pick) ─
export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => draftBoards.id, { onDelete: "cascade" }),
  pickNumber: integer("pick_number").notNull(),
  exactMatch: boolean("exact_match").default(false),
  playerCorrect: boolean("player_correct").default(false),
  teamCorrect: boolean("team_correct").default(false),
  positionCorrect: boolean("position_correct").default(false),
  slotDelta: integer("slot_delta"),
  pointsAwarded: integer("points_awarded").default(0),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});
