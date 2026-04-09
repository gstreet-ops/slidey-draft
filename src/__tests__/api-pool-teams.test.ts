import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/pools/[poolId]/teams/route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      pools: {
        findFirst: vi.fn(),
      },
      poolTeams: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = vi.mocked(auth);
const mockPoolsFindFirst = vi.mocked(db.query.pools.findFirst);
const mockTeamsFindMany = vi.mocked(db.query.poolTeams.findMany);
const mockInsert = vi.mocked(db.insert);

function makeGET(poolId = "pool-1"): NextRequest {
  return new NextRequest(`http://localhost/api/pools/${poolId}/teams`);
}

function makePOST(body: unknown, poolId = "pool-1"): NextRequest {
  return new NextRequest(`http://localhost/api/pools/${poolId}/teams`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ poolId: "pool-1" });

const mockPool = {
  id: "pool-1",
  commissionerId: "user-commissioner",
  name: "Test Pool",
};

const mockTeams = [
  { id: "team-1", name: "Alpha", colorHex: "#ff0000", poolId: "pool-1", createdAt: new Date() },
  { id: "team-2", name: "Beta", colorHex: "#0000ff", poolId: "pool-1", createdAt: new Date() },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-commissioner" } } as any);
  mockPoolsFindFirst.mockResolvedValue(mockPool as any);
  mockTeamsFindMany.mockResolvedValue(mockTeams as any);
  // Default select mock for members queries
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  } as any);
});

describe("GET /api/pools/[poolId]/teams", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await GET(makeGET(), { params });
    expect(res.status).toBe(401);
  });

  it("returns teams with members array", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ userId: "u-1", userName: "Alice" }]),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

    const res = await GET(makeGET(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teams).toHaveLength(2);
    expect(json.teams[0]).toHaveProperty("members");
    expect(Array.isArray(json.teams[0].members)).toBe(true);
    expect(json.teams[0].members[0]).toEqual({ userId: "u-1", userName: "Alice" });
  });
});

describe("POST /api/pools/[poolId]/teams", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await POST(makePOST({ name: "Team Alpha" }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 401/403 for non-commissioners", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-other" } } as any);
    const res = await POST(makePOST({ name: "Team Alpha" }), { params });
    // Route returns 401 for non-commissioner (based on route implementation)
    expect([401, 403]).toContain(res.status);
  });

  it("creates a team when called by commissioner", async () => {
    const newTeam = { id: "team-3", name: "Team Alpha", colorHex: "#4A7AB5", poolId: "pool-1" };
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newTeam]),
      }),
    } as any);

    const res = await POST(makePOST({ name: "Team Alpha" }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toEqual(newTeam);
  });

  it("returns 400 when team name is missing", async () => {
    const res = await POST(makePOST({}), { params });
    expect(res.status).toBe(400);
  });
});
