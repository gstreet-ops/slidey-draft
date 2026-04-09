import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/pools/[poolId]/trivia/route";
import { POST } from "@/app/api/pools/[poolId]/trivia/answer/route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    query: {
      triviaQuestions: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = vi.mocked(auth);

function makeGET(poolId = "pool-1"): NextRequest {
  return new NextRequest(`http://localhost/api/pools/${poolId}/trivia`);
}

function makePOST(body: unknown, poolId = "pool-1"): NextRequest {
  return new NextRequest(`http://localhost/api/pools/${poolId}/trivia/answer`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockQuestion = {
  id: "q-1",
  question: "Who won Super Bowl LV?",
  optionA: "Chiefs",
  optionB: "Buccaneers",
  optionC: "Packers",
  optionD: "Bills",
  correctOption: "B",
  category: "Football",
  difficulty: "medium",
};

const params = Promise.resolve({ poolId: "pool-1" });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
});

describe("GET /api/pools/[poolId]/trivia", () => {
  it("returns a question when unanswered questions exist", async () => {
    // answered query returns empty, questions query returns one question
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockQuestion]),
            }),
          }),
        }),
      } as any);

    const res = await GET(makeGET(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("q-1");
    expect(json.question).toBe(mockQuestion.question);
  });

  it("returns { noMoreQuestions: true } when all answered", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ questionId: "q-1" }]),
        }),
      } as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

    const res = await GET(makeGET(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ noMoreQuestions: true });
  });

  it("does not return the correctOption field", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockQuestion]),
            }),
          }),
        }),
      } as any);

    const res = await GET(makeGET(), { params });
    const json = await res.json();
    expect(json).not.toHaveProperty("correctOption");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await GET(makeGET(), { params });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/pools/[poolId]/trivia/answer", () => {
  it("returns correct=true and pointsAwarded=5 when answer matches correctOption", async () => {
    vi.mocked(db.query.triviaQuestions.findFirst).mockResolvedValue(mockQuestion as any);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const res = await POST(makePOST({ questionId: "q-1", selectedOption: "B" }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.correct).toBe(true);
    expect(json.pointsAwarded).toBe(5);
  });

  it("returns correct=false and pointsAwarded=0 when wrong", async () => {
    vi.mocked(db.query.triviaQuestions.findFirst).mockResolvedValue(mockQuestion as any);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const res = await POST(makePOST({ questionId: "q-1", selectedOption: "A" }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.correct).toBe(false);
    expect(json.pointsAwarded).toBe(0);
  });

  it("returns 400 when questionId is missing", async () => {
    const res = await POST(makePOST({ selectedOption: "A" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when selectedOption is missing", async () => {
    const res = await POST(makePOST({ questionId: "q-1" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await POST(makePOST({ questionId: "q-1", selectedOption: "B" }), { params });
    expect(res.status).toBe(401);
  });
});
