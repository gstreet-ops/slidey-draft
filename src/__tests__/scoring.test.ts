import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database layer ───────────────────────────────────────────────
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/pool-helpers", () => ({
  getPoolSettings: vi.fn(),
}));

import { db } from "@/db";
import { scoreBoard } from "@/lib/scoring";
import { recalculatePoolStandings } from "@/lib/pool-scoring";
import { getPoolSettings } from "@/lib/pool-helpers";

// ─── Helpers to build chainable Drizzle mock ──────────────────────────────
function selectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(rows);
  const withWhere = { where: terminal };
  const withOrderBy = { orderBy: vi.fn().mockResolvedValue(rows) };
  const withWhereOrderBy = {
    where: vi.fn().mockReturnValue(withOrderBy),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  chain.from = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(rows),
      limit: vi.fn().mockResolvedValue(rows),
      ...withWhere,
    }),
    orderBy: vi.fn().mockResolvedValue(rows),
    ...withWhere,
  });
  return chain;
}

function selectRows(rows: unknown[]) {
  const whereResult = {
    orderBy: vi.fn().mockResolvedValue(rows),
    limit: vi.fn().mockResolvedValue(rows),
    groupBy: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
  };
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereResult),
      orderBy: vi.fn().mockResolvedValue(rows),
      groupBy: vi.fn().mockResolvedValue(rows),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
    }),
  };
}

function insertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

function updateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

function deleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

// Shorthand: selectOnce for multiple sequential select() calls
function mockSelectSequence(rows: unknown[][]) {
  let call = 0;
  vi.mocked(db.select).mockImplementation(() => {
    const r = rows[call] ?? [];
    call++;
    return selectRows(r) as any;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.insert).mockReturnValue(insertChain() as any);
  vi.mocked(db.update).mockReturnValue(updateChain() as any);
  vi.mocked(db.delete).mockReturnValue(deleteChain() as any);
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreBoard — pure scoring logic
// ─────────────────────────────────────────────────────────────────────────────
describe("scoreBoard", () => {
  const boardId = "board-1";

  const actualResults = [
    { pickNumber: 1, playerId: "p1", teamId: "t1" },
    { pickNumber: 2, playerId: "p2", teamId: "t2" },
    { pickNumber: 10, playerId: "p10", teamId: "t10" },
    { pickNumber: 20, playerId: "p20", teamId: "t20" },
  ];

  it("awards 10 pts for an exact match (same player, same pick)", async () => {
    // boardPicks: pick 1 = p1  (exact match)
    // db.select calls: boardPicks, board.createdBy, existing score row
    mockSelectSequence([
      [{ pickNumber: 1, playerId: "p1" }],          // boardPicks
      [{ createdBy: "user-1" }],                     // board lookup
      [],                                            // no existing score row
    ]);

    const results = [{ pickNumber: 1, playerId: "p1", teamId: "t1" }];
    await scoreBoard(boardId, results);

    // The insert for scores should have totalScore=10
    const insertMock = vi.mocked(db.insert);
    const scoreInsertCall = insertMock.mock.calls.find((_, i) => {
      const vals = (insertMock.mock.results[i].value as any)?.values?.mock?.calls?.[0]?.[0];
      return vals && "totalScore" in vals;
    });
    // Get the values passed to the scores insert
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const scoreRow = allValuesCalls.find(
      (args: any[]) => args[0] && "totalScore" in args[0]
    );
    expect(scoreRow).toBeDefined();
    expect(scoreRow![0].totalScore).toBe(10);
    expect(scoreRow![0].correctExact).toBe(1);
  });

  it("awards 5 pts for a close match (same player, within 5 picks)", async () => {
    // board picks p2 at slot 1, but p2 actually goes at slot 3 (delta=2)
    mockSelectSequence([
      [{ pickNumber: 1, playerId: "p2" }],
      [{ createdBy: "user-1" }],
      [],
    ]);

    const results = [
      { pickNumber: 1, playerId: "p1", teamId: "t1" },
      { pickNumber: 3, playerId: "p2", teamId: "t2" },
    ];
    await scoreBoard(boardId, results);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const scoreRow = allValuesCalls.find(
      (args: any[]) => args[0] && "totalScore" in args[0]
    );
    expect(scoreRow).toBeDefined();
    expect(scoreRow![0].totalScore).toBe(5);
    expect(scoreRow![0].correctExact).toBe(0);
    expect(scoreRow![0].correctPlayer).toBe(1);
  });

  it("awards 3 pts for a far match (same player, 6+ picks off)", async () => {
    // board picks p20 at slot 1, p20 actually goes at slot 10 (delta=9)
    mockSelectSequence([
      [{ pickNumber: 1, playerId: "p20" }],
      [{ createdBy: "user-1" }],
      [],
    ]);

    const results = [
      { pickNumber: 1, playerId: "p1", teamId: "t1" },
      { pickNumber: 10, playerId: "p20", teamId: "t20" },
    ];
    await scoreBoard(boardId, results);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const scoreRow = allValuesCalls.find(
      (args: any[]) => args[0] && "totalScore" in args[0]
    );
    expect(scoreRow).toBeDefined();
    expect(scoreRow![0].totalScore).toBe(3);
    expect(scoreRow![0].correctExact).toBe(0);
  });

  it("awards 0 pts for a miss (player not in actual results)", async () => {
    // board picks "unknown-player" at slot 1
    mockSelectSequence([
      [{ pickNumber: 1, playerId: "unknown-player" }],
      [{ createdBy: "user-1" }],
      [],
    ]);

    const results = [{ pickNumber: 1, playerId: "p1", teamId: "t1" }];
    await scoreBoard(boardId, results);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const scoreRow = allValuesCalls.find(
      (args: any[]) => args[0] && "totalScore" in args[0]
    );
    expect(scoreRow).toBeDefined();
    expect(scoreRow![0].totalScore).toBe(0);
    expect(scoreRow![0].correctExact).toBe(0);
    expect(scoreRow![0].correctPlayer).toBe(0);
  });

  it("accumulates points across multiple picks", async () => {
    // Board pick 1 = p1 (exact), board pick 2 = p10 (close: p10 actually at pick 4),
    // board pick 3 = nobody (miss).
    // Actual pick numbers {1,2,3,4} — picks 1,2,3 exist so all three board picks are scored.
    // p10 goes at actual pick 4, delta from board pick 2 = |2-4| = 2 → close (5 pts).
    mockSelectSequence([
      [
        { pickNumber: 1, playerId: "p1" },
        { pickNumber: 2, playerId: "p10" },
        { pickNumber: 3, playerId: "nobody" },
      ],
      [{ createdBy: "user-1" }],
      [],
    ]);

    const results = [
      { pickNumber: 1, playerId: "p1", teamId: "t1" },  // p1 exact at slot 1
      { pickNumber: 2, playerId: "p2", teamId: "t2" },  // slot 2 exists (p2 goes there)
      { pickNumber: 3, playerId: "p3", teamId: "t3" },  // slot 3 exists (p3 goes there)
      { pickNumber: 4, playerId: "p10", teamId: "t10" }, // p10 actually at pick 4 (delta=2)
    ];
    await scoreBoard(boardId, results);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const scoreRow = allValuesCalls.find(
      (args: any[]) => args[0] && "totalScore" in args[0]
    );
    expect(scoreRow).toBeDefined();
    // 10 (exact) + 5 (close) + 0 (miss) = 15
    expect(scoreRow![0].totalScore).toBe(15);
  });

  it("does nothing when results array is empty", async () => {
    await scoreBoard(boardId, []);
    expect(vi.mocked(db.select)).not.toHaveBeenCalled();
  });

  it("updates existing score row instead of inserting", async () => {
    mockSelectSequence([
      [{ pickNumber: 1, playerId: "p1" }],
      [{ createdBy: "user-1" }],
      [{ id: "score-existing" }], // existing score row
    ]);

    const results = [{ pickNumber: 1, playerId: "p1", teamId: "t1" }];
    await scoreBoard(boardId, results);

    // update should have been called with totalScore=10
    const updateSet = vi.mocked(db.update).mock.results.flatMap((r) =>
      (r.value as any)?.set?.mock?.calls ?? []
    );
    const scoreUpdate = updateSet.find(
      (args: any[]) => args[0] && "totalScore" in args[0]
    );
    expect(scoreUpdate).toBeDefined();
    expect(scoreUpdate![0].totalScore).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recalculatePoolStandings — combined score logic
// ─────────────────────────────────────────────────────────────────────────────
describe("recalculatePoolStandings", () => {
  const poolId = "pool-1";

  it("combinedScore = mockBonus + liveTotal + triviaTotal", async () => {
    // Sequence of select() calls inside recalculatePoolStandings:
    // 1. poolMembers
    // 2. current poolStandings (for prev rank)
    // 3. triviaResponses grouped sum (user-1 → 15)
    // 4. mockScores for user-1
    // 5. liveScores aggregate for user-1
    // 6. existing poolStandings row for user-1 (none → insert)
    mockSelectSequence([
      [{ userId: "user-1" }],                               // members
      [],                                                    // current standings
      [{ userId: "user-1", total: 15 }],                    // trivia totals
      [{ totalMockBonus: 20 }],                             // mock scores
      [{ total: 10, predicted: 3, correct: 2 }],            // live scores
      [],                                                    // existing standing row
    ]);

    await recalculatePoolStandings(poolId);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const standingRow = allValuesCalls.find(
      (args: any[]) => args[0] && "combinedScore" in args[0]
    );
    expect(standingRow).toBeDefined();
    // 20 mockBonus + 10 liveTotal + 15 triviaTotal = 45
    expect(standingRow![0].combinedScore).toBe(45);
    expect(standingRow![0].mockBonus).toBe(20);
    expect(standingRow![0].liveTotal).toBe(10);
    expect(standingRow![0].triviaTotal).toBe(15);
  });

  it("triviaTotal is 0 when user has no trivia responses", async () => {
    mockSelectSequence([
      [{ userId: "user-2" }],
      [],
      [],                                                    // no trivia rows
      [{ totalMockBonus: 5 }],
      [{ total: 0, predicted: 0, correct: 0 }],
      [],
    ]);

    await recalculatePoolStandings(poolId);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const standingRow = allValuesCalls.find(
      (args: any[]) => args[0] && "combinedScore" in args[0]
    );
    expect(standingRow).toBeDefined();
    expect(standingRow![0].triviaTotal).toBe(0);
    expect(standingRow![0].combinedScore).toBe(5);
  });

  it("ranks members by combinedScore descending", async () => {
    // Two members: user-1 scores 30, user-2 scores 50 → user-2 rank=1
    // Select call order: members, prevStandings, trivia, mockUser1, liveUser1,
    //   mockUser2, liveUser2, existingStandingUser2 (sorted first), existingStandingUser1
    mockSelectSequence([
      [{ userId: "user-1" }, { userId: "user-2" }],         // members
      [],                                                    // current standings
      [                                                      // trivia
        { userId: "user-1", total: 5 },
        { userId: "user-2", total: 10 },
      ],
      [{ totalMockBonus: 15 }],                             // mock scores user-1
      [{ total: 10, predicted: 2, correct: 1 }],            // live user-1
      [{ totalMockBonus: 30 }],                             // mock scores user-2
      [{ total: 10, predicted: 2, correct: 2 }],            // live user-2
      [],                                                    // existing standing user-2 (sorted #1)
      [],                                                    // existing standing user-1 (sorted #2)
    ]);

    await recalculatePoolStandings(poolId);

    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const standingRows = allValuesCalls.filter(
      (args: any[]) => args[0] && "combinedScore" in args[0]
    );
    // user-1: 15+10+5=30, user-2: 30+10+10=50
    // sorted desc → user-2 inserted first (rank=1), user-1 second (rank=2)
    expect(standingRows[0][0].rank).toBe(1);
    expect(standingRows[0][0].combinedScore).toBe(50);
    expect(standingRows[1][0].rank).toBe(2);
    expect(standingRows[1][0].combinedScore).toBe(30);
  });

  it("updates existing standing row when one already exists", async () => {
    mockSelectSequence([
      [{ userId: "user-1" }],
      [{ userId: "user-1", rank: 1 }],                     // prev standing
      [{ userId: "user-1", total: 0 }],
      [{ totalMockBonus: 0 }],
      [{ total: 0, predicted: 0, correct: 0 }],
      [{ id: "standing-existing" }],                        // existing row
    ]);

    await recalculatePoolStandings(poolId);

    const updateSet = vi.mocked(db.update).mock.results.flatMap((r) =>
      (r.value as any)?.set?.mock?.calls ?? []
    );
    const standingUpdate = updateSet.find(
      (args: any[]) => args[0] && "combinedScore" in args[0]
    );
    expect(standingUpdate).toBeDefined();
    expect(standingUpdate![0].previousRank).toBe(1);
  });

  it("does nothing for a pool with no members", async () => {
    mockSelectSequence([
      [],  // no members
      [],  // current standings
      [],  // trivia (getTriviaScores still runs)
    ]);

    await recalculatePoolStandings(poolId);

    // No inserts or updates to poolStandings
    const insertMock = vi.mocked(db.insert);
    const allValuesCalls = insertMock.mock.results.flatMap((r) =>
      (r.value as any)?.values?.mock?.calls ?? []
    );
    const standingRow = allValuesCalls.find(
      (args: any[]) => args[0] && "combinedScore" in args[0]
    );
    expect(standingRow).toBeUndefined();
  });
});
