import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, handleApiError, checkOwnership } from "@/lib/api/middleware";
import { deviceUpdateSchema } from "@/lib/validations/api";

// GET /api/devices/[id] - Get single device
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sensorReadings: true,
            alerts: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    if (!checkOwnership(user.id, device.userId, user.role)) {
      return NextResponse.json(
        { error: "Forbidden. You don't have access to this device." },
        { status: 403 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/devices/[id] - Update device
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    if (!checkOwnership(user.id, device.userId, user.role)) {
      return NextResponse.json(
        { error: "Forbidden. You don't have access to this device." },
        { status: 403 }
      );
    }

    const validation = await validateBody(req, deviceUpdateSchema);
    if (validation instanceof NextResponse) return validation;

    const updated = await prisma.device.update({
      where: { id },
      data: validation.data,
    });

    // Log activity if thresholds were updated
    if (validation.data.thresholds) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "threshold_updated",
          details: { deviceId: device.id, thresholds: validation.data.thresholds },
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/devices/[id] - Unpair device
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    if (!checkOwnership(user.id, device.userId, user.role)) {
      return NextResponse.json(
        { error: "Forbidden. You don't have access to this device." },
        { status: 403 }
      );
    }

    await prisma.device.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "device_unpaired",
        details: { deviceId: device.id, serialNumber: device.serialNumber },
      },
    });

    return NextResponse.json({ message: "Device unpaired successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
