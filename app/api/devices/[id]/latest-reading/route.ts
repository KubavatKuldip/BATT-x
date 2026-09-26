import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";

// GET /api/devices/[id]/latest-reading - Get latest sensor reading for a device
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    // Verify device ownership
    const device = await prisma.device.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get latest reading
    const latestReading = await prisma.sensorReading.findFirst({
      where: { deviceId: id },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({
      device: {
        id: device.id,
        serialNumber: device.serialNumber,
        nickname: device.nickname,
        status: device.status,
        lastSeenAt: device.lastSeenAt,
      },
      reading: latestReading,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
