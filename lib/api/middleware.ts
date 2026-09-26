import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ZodSchema } from "zod";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

// Get authenticated user from session
export async function getAuthUser(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return null;
  }

  return {
    id: (session.user as any).id,
    email: session.user.email!,
    name: session.user.name || undefined,
    role: (session.user as any).role || "CONSUMER",
  };
}

// Require authentication middleware
export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  return user;
}

// Require specific role.
//
// Delegates to requireRole in lib/api/rbac.ts so the role hierarchy is honored
// (TECHNICIAN/ADMIN/SUPER_ADMIN all pass when FLEET_MANAGER is allowed, etc.).
// The previous literal-includes check silently rejected higher roles, so a
// SUPER_ADMIN got 403 on routes that only listed ADMIN/FLEET_MANAGER.
export { requireRole } from "@/lib/api/rbac";

// Validate request body with Zod schema
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await req.json();
    const validated = schema.parse(body);
    return { data: validated };
  } catch (error: any) {
    // Zod v4 exposes `error.issues`. The previous code read `error.errors`,
    // which is the v3 field and was always undefined here, so callers got
    // the generic "Invalid request body" string instead of useful details.
    if (error?.issues) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// Validate query parameters with Zod schema
export function validateQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): { data: T } | NextResponse {
  try {
    const searchParams = req.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    const validated = schema.parse(params);
    return { data: validated };
  } catch (error: any) {
    if (error?.issues) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: error.issues,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 }
    );
  }
}

// Handle API errors consistently
export function handleApiError(error: any) {
  console.error("API Error:", error);

  if (error.code === "P2002") {
    return NextResponse.json(
      { error: "A record with that value already exists" },
      { status: 409 }
    );
  }

  if (error.code === "P2025") {
    return NextResponse.json(
      { error: "Record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

// Check if user owns resource
//
// Access matrix (mirrors ROLE_HIERARCHY in lib/api/rbac.ts):
//   SUPER_ADMIN / ADMIN  → access everything
//   FLEET_MANAGER        → access everything in their fleet (treated as full
//                          access for now; the Fleet relation will narrow this
//                          once a Fleet model is added)
//   TECHNICIAN / CONSUMER → owner only
//
// SUPER_ADMIN was previously missed: the old check only matched the literal
// string "ADMIN", so a SUPER_ADMIN was treated as a regular user. Now we use
// the rank from ROLE_HIERARCHY.
import { ROLE_HIERARCHY, type UserRole } from "@/lib/api/rbac";

export function checkOwnership(
  userId: string,
  resourceUserId: string,
  userRole: string
): boolean {
  const rank = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  if (rank >= ROLE_HIERARCHY.FLEET_MANAGER) {
    return true;
  }
  return userId === resourceUserId;
}
