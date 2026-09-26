import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";

// GET /api/devices/locations - Get user's devices with their latest location data
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    // Get user's devices
    const devices = await prisma.device.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        serialNumber: true,
        nickname: true,
        vehicleType: true,
        connectionStatus: true,
      },
    });

    // For each device, get latest sensor reading with location
    const devicesWithLocations = await Promise.all(
      devices.map(async (device) => {
        // Get latest sensor reading with location
        const latestReading = await prisma.sensorReading.findFirst({
          where: {
            deviceId: device.id,
            locationLat: { not: null },
            locationLng: { not: null },
          },
          orderBy: { timestamp: "desc" },
          select: {
            locationLat: true,
            locationLng: true,
            timestamp: true,
            temperature: true,
            gasLevel: true,
            voltage: true,
            current: true,
            batteryPercent: true,
          },
        });

        // Get recent alerts with location
        const recentAlerts = await prisma.alert.findMany({
          where: {
            deviceId: device.id,
            locationLat: { not: null },
            locationLng: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            reason: true,
            locationLat: true,
            locationLng: true,
            createdAt: true,
            resolvedAt: true,
          },
        });

        // Get recent charge sessions with location
        const recentChargeSessions = await prisma.chargeSession.findMany({
          where: {
            deviceId: device.id,
            locationLat: { not: null },
            locationLng: { not: null },
          },
          orderBy: { startTime: "desc" },
          take: 3,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            locationLat: true,
            locationLng: true,
            startBattery: true,
            endBattery: true,
          },
        });

        return {
          device,
          latestReading,
          recentAlerts,
          recentChargeSessions,
        };
      })
    );

    return NextResponse.json({
      locations: devicesWithLocations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
