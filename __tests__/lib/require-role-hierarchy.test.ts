// Regression test for the F-05 fix: `requireRole` re-exported from
// `lib/api/middleware` must use the role hierarchy (so a SUPER_ADMIN passes
// when only FLEET_MANAGER is in the allowed list), not a literal `.includes()`
// check.
//
// We mock `next/server` (so we don't need jsdom Request) and `lib/auth`
// (so we control the session), then exercise the real `requireRole` from
// `lib/api/middleware`.

jest.mock("next/server", () => {
  // Need a real class so `instanceof NextResponse` works in requireRole
  // (lib/api/rbac.ts:20). Plain object literals fail the instanceof check.
  class FakeNextResponse {
    body: any;
    status: number;
    constructor(body: any, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static json(body: any, init?: { status?: number }) {
      return new FakeNextResponse(body, init);
    }
  }
  return { NextResponse: FakeNextResponse };
});

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { requireRole } from "@/lib/api/middleware";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const mockAuth = auth as jest.MockedFunction<typeof auth>;

const fakeReq = {} as any; // requireRole only forwards req to auth()

const isNextResponse = (x: any) => x instanceof NextResponse;

describe("requireRole re-export from lib/api/middleware", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireRole(fakeReq, ["FLEET_MANAGER"]);
    expect(isNextResponse(result)).toBe(true);
    expect((result as any).status).toBe(401);
  });

  it("returns 403 for a CONSUMER calling a FLEET_MANAGER route", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "c@battx.com", role: "CONSUMER" },
    } as any);
    const result = await requireRole(fakeReq, ["FLEET_MANAGER"]);
    expect(isNextResponse(result)).toBe(true);
    expect((result as any).status).toBe(403);
  });

  it("returns the user when role matches exactly", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "fm@battx.com", role: "FLEET_MANAGER" },
    } as any);
    const result = await requireRole(fakeReq, ["FLEET_MANAGER"]);
    expect(isNextResponse(result)).toBe(false);
    expect((result as any).user.id).toBe("u1");
  });

  it("accepts TECHNICIAN when only FLEET_MANAGER is in the allowed list (hierarchy)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "t@battx.com", role: "TECHNICIAN" },
    } as any);
    const result = await requireRole(fakeReq, ["FLEET_MANAGER"]);
    expect(isNextResponse(result)).toBe(false);
    expect((result as any).user.role).toBe("TECHNICIAN");
  });

  it("accepts ADMIN when only FLEET_MANAGER is in the allowed list (hierarchy)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "a@battx.com", role: "ADMIN" },
    } as any);
    const result = await requireRole(fakeReq, ["FLEET_MANAGER"]);
    expect(isNextResponse(result)).toBe(false);
  });

  it("accepts SUPER_ADMIN when only FLEET_MANAGER is in the allowed list — regression of F-05", async () => {
    // Before the fix, the old `.includes()` check in lib/api/middleware
    // returned 403 for SUPER_ADMIN on any route that did not list SUPER_ADMIN
    // explicitly. The fix delegates to lib/api/rbac.ts so the hierarchy is
    // honored.
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "sa@battx.com", role: "SUPER_ADMIN" },
    } as any);
    const result = await requireRole(fakeReq, ["FLEET_MANAGER"]);
    expect(isNextResponse(result)).toBe(false);
    expect((result as any).user.role).toBe("SUPER_ADMIN");
  });

  it("accepts SUPER_ADMIN when only ADMIN is in the allowed list (hierarchy)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "sa@battx.com", role: "SUPER_ADMIN" },
    } as any);
    const result = await requireRole(fakeReq, ["ADMIN"]);
    expect(isNextResponse(result)).toBe(false);
  });

  it("rejects TECHNICIAN when only ADMIN is in the allowed list (below the floor)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "t@battx.com", role: "TECHNICIAN" },
    } as any);
    const result = await requireRole(fakeReq, ["ADMIN"]);
    expect(isNextResponse(result)).toBe(true);
    expect((result as any).status).toBe(403);
  });
});
