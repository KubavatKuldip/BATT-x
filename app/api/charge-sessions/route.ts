import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";

// GET /api/charge-sessions - Get user's charge sessions
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const searchParams = req.nextUrl.searchParams;
    const deviceId = searchParams.get("deviceId");

    // Get user's devices
    const userDevices = await prisma.device.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const deviceIds = userDevices.map(d => d.id);

    const where: any = {
      deviceId: { in: deviceIds },
    };

    if (deviceId) {
      if (!deviceIds.includes(deviceId)) {
        return NextResponse.json(
          { error: "Device not found or access denied" },
          { status: 403 }
        );
      }
      where.deviceId = deviceId;
    }

    const sessions = await prisma.chargeSession.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 50,
      include: {
        device: {
          select: {
            nickname: true,
            serialNumber: true,
          },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return handleApiError(error);
  }
}
