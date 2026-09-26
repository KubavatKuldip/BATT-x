import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/middleware";

export type UserRole = "CONSUMER" | "FLEET_MANAGER" | "TECHNICIAN" | "ADMIN" | "SUPER_ADMIN";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  CONSUMER: 1,
  FLEET_MANAGER: 2,
  TECHNICIAN: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

/**
 * Require user to have at least one of the specified roles
 * Uses role hierarchy so higher roles include lower role permissions
 */
export async function requireRole(req: NextRequest, allowedRoles: UserRole[]): Promise<NextResponse | { user: any }> {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const userRole = (authResult as any).role as UserRole;

  if (!userRole) {
    return NextResponse.json({ error: "User role not found" }, { status: 403 });
  }

  // Check if user's role level meets the minimum required
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const minRequiredLevel = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r]));

  if (userLevel < minRequiredLevel) {
    return NextResponse.json(
      { error: "Insufficient permissions to access this resource" },
      { status: 403 }
    );
  }

  return { user: authResult };
}

/**
 * Check if a user has admin privileges
 */
export function isAdmin(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.ADMIN;
}

/**
 * Check if a user is a fleet manager or above
 */
export function isFleetManager(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.FLEET_MANAGER;
}