import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, handleApiError } from "@/lib/api/middleware";
import { deviceCreateSchema } from "@/lib/validations/api";

// GET /api/devices - Get user's devices
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const devices = await prisma.device.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        serialNumber: true,
        vehicleType: true,
        nickname: true,
        firmwareVersion: true,
        pairedAt: true,
        lastSyncAt: true,
        connectionStatus: true,
        thresholds: true,
      },
      orderBy: { pairedAt: "desc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/devices - Pair new device
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await validateBody(req, deviceCreateSchema);
    if (validation instanceof NextResponse) return validation;

    // Check if device is already paired
    const existing = await prisma.device.findUnique({
      where: { serialNumber: validation.data.serialNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Device is already paired to an account" },
        { status: 409 }
      );
    }

    // Default thresholds
    const defaultThresholds = {
      tempMax: 65,
      tempMin: 0,
      gasMax: 80,
      voltageMax: 54,
      voltageMin: 40,
      currentMax: 15,
    };

    const device = await prisma.device.create({
      data: {
        userId: user.id,
        serialNumber: validation.data.serialNumber,
        vehicleType: validation.data.vehicleType,
        nickname: validation.data.nickname,
        thresholds: defaultThresholds,
        connectionStatus: "PAIRING", // Changed from OFFLINE to reflect actual state
      },
      select: {
        id: true,
        serialNumber: true,
        vehicleType: true,
        nickname: true,
        firmwareVersion: true,
        pairedAt: true,
        connectionStatus: true,
        thresholds: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "device_paired",
        details: { deviceId: device.id, serialNumber: device.serialNumber },
      },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
