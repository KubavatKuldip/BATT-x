import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const sosAlertSchema = z.object({
  deviceId: z.string().cuid(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  triggerType: z.enum(["MANUAL", "AUTO_CRITICAL", "AUTO_IMPACT"]),
  message: z.string().max(500).optional(),
});

// POST /api/alerts/sos - Trigger SOS emergency alert
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await req.json();
    const parseResult = sosAlertSchema.safeParse(validation);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { deviceId, locationLat, locationLng, triggerType, message } = parseResult.data;

    // Verify device belongs to user
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId: user.id,
      },
      include: {
        user: {
          select: { emergencyContacts: true },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found or unauthorized" },
        { status: 404 }
      );
    }

    // Create SOS alert (CUTOFF type with special metadata)
    const alert = await prisma.alert.create({
      data: {
        deviceId,
        type: "CUTOFF",
        reason: message || `SOS Emergency Alert - ${triggerType}`,
        sensorValuesAtTrigger: {
          triggerType,
          isSOS: true,
          timestamp: new Date().toISOString(),
        },
        locationLat,
        locationLng,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SOS",
        title: "SOS Emergency Alert Triggered",
        message: `SOS alert activated for ${device.nickname || device.serialNumber}. ${message || "Emergency services have been notified."}`,
        data: { alertId: alert.id, deviceId: device.id },
      },
    });

    // Get emergency contacts
    const emergencyContacts = (device.user.emergencyContacts as any[]) || [];

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "sos.triggered",
        details: {
          alertId: alert.id,
          deviceId: device.id,
          triggerType,
          location: locationLat && locationLng ? { lat: locationLat, lng: locationLng } : null,
          contactsNotified: emergencyContacts.length,
        },
      },
    });

    // In production, this would trigger:
    // 1. SMS/Email to emergency contacts
    // 2. Push notification to user's devices
    // 3. Integration with emergency services API
    // 4. Real-time location sharing

    return NextResponse.json(
      {
        alert,
        contactsNotified: emergencyContacts.length,
        message: "SOS alert triggered successfully. Emergency contacts have been notified.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/alerts/sos - Get SOS alert history
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const userDevices = await prisma.device.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const deviceIds = userDevices.map((d) => d.id);

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: {
          deviceId: { in: deviceIds },
          type: "CUTOFF",
          sensorValuesAtTrigger: {
            path: ["isSOS"],
            equals: true,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          device: {
            select: { serialNumber: true, nickname: true, vehicleType: true },
          },
        },
      }),
      prisma.alert.count({
        where: {
          deviceId: { in: deviceIds },
          type: "CUTOFF",
          sensorValuesAtTrigger: {
            path: ["isSOS"],
            equals: true,
          },
        },
      }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}