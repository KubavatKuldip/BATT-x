import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, handleApiError } from "@/lib/api/middleware";
import { activityLogCreateSchema } from "@/lib/validations/api";

// POST /api/activity-logs - Create activity log
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await validateBody(req, activityLogCreateSchema);
    if (validation instanceof NextResponse) return validation;

    const log = await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: validation.data.action,
        details: validation.data.details as any || {},
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
