import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/pools/[poolId]/theme/route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      pools: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(db.query.pools.findFirst);
const mockUpdate = vi.mocked(db.update);

function makePOST(body: unknown, poolId = "pool-1"): NextRequest {
  return new NextRequest(`http://localhost/api/pools/${poolId}/theme`, {
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

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-commissioner" } } as any);
  mockFindFirst.mockResolvedValue(mockPool as any);
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as any);
});

describe("POST /api/pools/[poolId]/theme", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await POST(makePOST({ primaryColor: "#ff0000" }), { params });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when caller is not the commissioner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-other" } } as any);
    const res = await POST(makePOST({ primaryColor: "#ff0000" }), { params });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/commissioner/i);
  });

  it("returns 200 and updates pool when commissioner sets colors", async () => {
    const res = await POST(makePOST({ primaryColor: "#ff0000", secondaryColor: "#0000ff" }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("accepts null values to clear theme", async () => {
    const res = await POST(makePOST({ primaryColor: null, secondaryColor: null }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });
  });
});
