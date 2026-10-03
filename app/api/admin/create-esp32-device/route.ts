import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/create-esp32-device
// Manually create Device record for physical ESP32
// Body: { "serialNumber": "BATTX-FB3F00000000" }
// Headers: { "x-demo-init-secret": "<SECRET>" }

export async function POST(req: NextRequest) {
  try {
    // 1. Production environment check
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "This endpoint only works in production" },
        { status: 403 }
      );
    }

    // 2. Verify secret
    const secret = req.headers.get("x-demo-init-secret");
    if (!secret || secret !== process.env.DEMO_INIT_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get request body
    const body = await req.json();
    const { serialNumber } = body;

    if (!serialNumber) {
      return NextResponse.json(
        { error: "serialNumber is required" },
        { status: 400 }
      );
    }

    // 4. Find demo user
    const demoUser = await prisma.user.findUnique({
      where: { email: "demo@battx.com" },
      select: { id: true },
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not found" },
        { status: 404 }
      );
    }

    // 5. Check if device already exists
    const existing = await prisma.device.findFirst({
      where: {
        serialNumber: {
          equals: serialNumber,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: "Device already exists",
        deviceId: existing.id,
        ownerId: existing.userId,
      });
    }

    // 6. Create device
    const device = await prisma.device.create({
      data: {
        userId: demoUser.id,
        serialNumber: serialNumber,
        vehicleType: "TWO_WHEELER",
        nickname: "Physical ESP32",
        connectionStatus: "PAIRING",
        thresholds: {
          tempMax: 60,
          tempMin: -20,
          gasMax: 100,
          voltageMax: 58,
          voltageMin: 44,
          currentMax: 30,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Device created successfully",
      device: {
        id: device.id,
        serialNumber: device.serialNumber,
        userId: device.userId,
        vehicleType: device.vehicleType,
        connectionStatus: device.connectionStatus,
      },
      nextStep: "ESP32 will receive this deviceId on next /api/devices/claim poll",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
