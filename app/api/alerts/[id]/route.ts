import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, handleApiError, checkOwnership } from "@/lib/api/middleware";
import { alertUpdateSchema } from "@/lib/validations/api";

// PUT /api/alerts/[id] - Update alert (mark as resolved)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { device: true },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    if (!checkOwnership(user.id, alert.device.userId, user.role)) {
      return NextResponse.json(
        { error: "Forbidden. You don't have access to this alert." },
        { status: 403 }
      );
    }

    const validation = await validateBody(req, alertUpdateSchema);
    if (validation instanceof NextResponse) return validation;

    const updated = await prisma.alert.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
