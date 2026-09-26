import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, handleApiError } from "@/lib/api/middleware";
import { userUpdateSchema } from "@/lib/validations/api";

// PUT /api/users/me - Update current user profile
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await validateBody(req, userUpdateSchema);
    if (validation instanceof NextResponse) return validation;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: validation.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emergencyContacts: true,
        preferredLanguage: true,
      },
    });

    // Audit log so profile changes are traceable. (Other mutating routes
    // in this codebase already log; this one was missing.)
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "user.profile.updated",
        details: {
          changedFields: Object.keys(validation.data),
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
