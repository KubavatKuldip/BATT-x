import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Utility endpoint to associate an existing device with demo user
// Usage: POST /api/admin/link-device-to-demo
// Body: { "serialNumber": "BATTX-686A484709" }
// Headers: { "x-demo-init-secret": "<DEMO_INIT_SECRET>" }

export async function POST(req: NextRequest) {
  try {
    // 1. Production environment check
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "This endpoint only works in production" },
        { status: 403 }
      );
    }

    // 2. Verify secret from header
    const secret = req.headers.get("x-demo-init-secret");

    if (!secret) {
      return NextResponse.json(
        { error: "Missing x-demo-init-secret header" },
        { status: 401 }
      );
    }

    if (!process.env.DEMO_INIT_SECRET) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (secret !== process.env.DEMO_INIT_SECRET) {
      return NextResponse.json(
        { error: "Invalid secret" },
        { status: 403 }
      );
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
      select: { id: true, email: true, name: true },
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not found" },
        { status: 404 }
      );
    }

    // 5. Find device by serial number (case-insensitive)
    const device = await prisma.device.findFirst({
      where: {
        serialNumber: {
          equals: serialNumber,
          mode: "insensitive",
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: `Device with serial ${serialNumber} not found` },
        { status: 404 }
      );
    }

    // 6. Update device to be owned by demo user
    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        userId: demoUser.id,
        connectionStatus: "CONNECTED",
      },
    });

    // 7. Get latest sensor reading for this device
    const latestReading = await prisma.sensorReading.findFirst({
      where: { deviceId: device.id },
      orderBy: { timestamp: "desc" },
      select: {
        temperature: true,
        gasLevel: true,
        voltage: true,
        current: true,
        batteryPercent: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Device successfully linked to demo user",
      device: {
        id: updatedDevice.id,
        serialNumber: updatedDevice.serialNumber,
        nickname: updatedDevice.nickname,
        previousOwner: device.userId,
        newOwner: demoUser.id,
        connectionStatus: updatedDevice.connectionStatus,
      },
      demoUser: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
      },
      latestReading,
    });
  } catch (error: any) {
    console.error("[link-device-to-demo] Error:", error);
    return NextResponse.json(
      { error: "Failed to link device", details: error.message },
      { status: 500 }
    );
  }
}
