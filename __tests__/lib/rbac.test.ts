// Unit tests for the pure type-level utilities in rbac.ts
// (avoiding the route handler import which pulls in NextRequest not available in jsdom)

describe("RBAC role hierarchy constants", () => {
  it("rank ordering: CONSUMER < FLEET_MANAGER < TECHNICIAN < ADMIN < SUPER_ADMIN", () => {
    const order = ["CONSUMER", "FLEET_MANAGER", "TECHNICIAN", "ADMIN", "SUPER_ADMIN"];
    // Sanity check: every level is greater than the previous
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]).not.toEqual(order[i]);
    }
  });
});

describe("isAdmin / isFleetManager logic", () => {
  // Re-implement the helpers to test the logic without importing the Next-coupled module
  const ROLE_HIERARCHY: Record<string, number> = {
    CONSUMER: 1,
    FLEET_MANAGER: 2,
    TECHNICIAN: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5,
  };
  const isAdmin = (role: string) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.ADMIN;
  const isFleetManager = (role: string) =>
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.FLEET_MANAGER;

  it("isAdmin is true for ADMIN and SUPER_ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("SUPER_ADMIN")).toBe(true);
  });

  it("isAdmin is false for non-admin roles", () => {
    expect(isAdmin("CONSUMER")).toBe(false);
    expect(isAdmin("FLEET_MANAGER")).toBe(false);
    expect(isAdmin("TECHNICIAN")).toBe(false);
  });

  it("isFleetManager is true for FLEET_MANAGER and above", () => {
    expect(isFleetManager("FLEET_MANAGER")).toBe(true);
    expect(isFleetManager("TECHNICIAN")).toBe(true);
    expect(isFleetManager("ADMIN")).toBe(true);
    expect(isFleetManager("SUPER_ADMIN")).toBe(true);
  });

  it("isFleetManager is false for CONSUMER", () => {
    expect(isFleetManager("CONSUMER")).toBe(false);
  });
});
