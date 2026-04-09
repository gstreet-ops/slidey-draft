import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/user/team/route";

// Mock @/lib/auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock @/db
vi.mock("@/db", () => ({
  db: {
    query: {
      teams: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(db.query.teams.findFirst);
const mockUpdate = vi.mocked(db.update);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/user/team", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockTeam = {
  id: "team-1",
  name: "Dallas Cowboys",
  abbreviation: "DAL",
  primaryColor: "#003594",
  secondaryColor: "#869397",
  logoUrl: "https://example.com/dal.png",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated user
  mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
  // Default: team found
  mockFindFirst.mockResolvedValue(mockTeam as any);
  // Default: update chain
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as any);
});

describe("POST /api/user/team", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await POST(makeRequest({ teamId: "team-1" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} } as any);
    const res = await POST(makeRequest({ teamId: "team-1" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when teamId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: "teamId is required" });
  });

  it("returns 400 when teamId is not a string", async () => {
    const res = await POST(makeRequest({ teamId: 42 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: "teamId is required" });
  });

  it("returns 404 when team does not exist in DB", async () => {
    mockFindFirst.mockResolvedValue(undefined as any);
    const res = await POST(makeRequest({ teamId: "nonexistent" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "Team not found" });
  });

  it("returns 200 with team data and calls db.update when valid", async () => {
    const res = await POST(makeRequest({ teamId: "team-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      favoriteTeam: {
        id: mockTeam.id,
        name: mockTeam.name,
        abbreviation: mockTeam.abbreviation,
        primaryColor: mockTeam.primaryColor,
        secondaryColor: mockTeam.secondaryColor,
        logoUrl: mockTeam.logoUrl,
      },
    });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
