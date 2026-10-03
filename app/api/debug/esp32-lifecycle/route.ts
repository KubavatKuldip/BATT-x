import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/debug/esp32-lifecycle?serial=BATTX-FB3F00000000
// Diagnostic endpoint to trace ESP32 device lifecycle
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get('serial') || 'BATTX-FB3F00000000';

    // 1. Check for Device record with this exact serial
    const device = await prisma.device.findFirst({
      where: {
        serialNumber: {
          equals: serial,
          mode: 'insensitive',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // 2. Check for other device (BATTX-686A484709)
    const otherDevice = await prisma.device.findFirst({
      where: {
        serialNumber: {
          equals: 'BATTX-686A484709',
          mode: 'insensitive',
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // 3. Check demo user's devices
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@battx.com' },
      select: { id: true, email: true },
    });

    let demoDevices = [];
    if (demoUser) {
      demoDevices = await prisma.device.findMany({
        where: { userId: demoUser.id },
        select: {
          id: true,
          serialNumber: true,
          connectionStatus: true,
          lastSyncAt: true,
        },
      });
    }

    // 4. Get latest sensor readings
    const recentReadings = await prisma.sensorReading.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        device: {
          select: {
            serialNumber: true,
          },
        },
      },
    });

    // 5. Check all devices with similar serials
    const similarDevices = await prisma.device.findMany({
      where: {
        OR: [
          { serialNumber: { contains: 'FB3F', mode: 'insensitive' } },
          { serialNumber: { contains: '686A48', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        serialNumber: true,
        userId: true,
        connectionStatus: true,
        pairedAt: true,
      },
    });

    // Build diagnosis
    let diagnosis = {
      timestamp: new Date().toISOString(),
      physicalESP32Serial: serial,
      deviceRecord: device ? {
        exists: true,
        deviceId: device.id,
        serialNumber: device.serialNumber,
        userId: device.userId,
        ownerEmail: device.user.email,
        ownerName: device.user.name,
        connectionStatus: device.connectionStatus,
        lastSyncAt: device.lastSyncAt,
        pairedAt: device.pairedAt,
      } : {
        exists: false,
        reason: 'Device record not found - ESP32 was never paired through web app',
      },
      otherDevice686A: otherDevice ? {
        exists: true,
        deviceId: otherDevice.id,
        ownerEmail: otherDevice.user.email,
        connectionStatus: otherDevice.connectionStatus,
      } : {
        exists: false,
      },
      demoUser: demoUser ? {
        exists: true,
        userId: demoUser.id,
        deviceCount: demoDevices.length,
        devices: demoDevices,
      } : {
        exists: false,
      },
      similarDevices,
      recentReadings: recentReadings.map(r => ({
        deviceSerial: r.device.serialNumber,
        temperature: r.temperature,
        gasLevel: r.gasLevel,
        voltage: r.voltage,
        current: r.current,
        batteryPercent: r.batteryPercent,
        timestamp: r.timestamp,
        ageSeconds: Math.floor((Date.now() - r.timestamp.getTime()) / 1000),
      })),
      rootCause: !device ?
        'Device record does not exist. ESP32 never completed pairing flow.' :
        'Device record exists. Check if ESP32 has correct deviceId in NVS.',
      nextStep: !device ?
        'Complete web pairing: scan QR or manually enter BATTX-FB3F00000000 in /devices/pairing' :
        `Verify ESP32 NVS contains deviceId: ${device.id}`,
    };

    return NextResponse.json(diagnosis, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
