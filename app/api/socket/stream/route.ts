import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/middleware";
import { verifyDeviceIngestKey } from "@/lib/api/device-auth";
import { z } from "zod";

const sensorStreamSchema = z.object({
  deviceId: z.string().cuid(),
  temperature: z.number().min(-50).max(150),
  gasLevel: z.number().min(0).max(10000),
  voltage: z.number().min(0).max(100),
  current: z.number().min(-50).max(50),
  batteryPercent: z.number().min(0).max(100),
  integrityHash: z.string().min(32).max(128),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

// POST /api/socket/stream - Simulates real-time sensor data ingestion
// In production, this would be replaced by Socket.io or MQTT listener.
// Auth: device must present X-Device-Key matching DEVICE_INGEST_SECRET.
export async function POST(req: NextRequest) {
  try {
    if (!verifyDeviceIngestKey(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = sensorStreamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify device exists
    const device = await prisma.device.findUnique({
      where: { id: data.deviceId },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Store sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        deviceId: data.deviceId,
        temperature: data.temperature,
        gasLevel: data.gasLevel,
        voltage: data.voltage,
        current: data.current,
        batteryPercent: data.batteryPercent,
        integrityHash: data.integrityHash,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
      },
    });

    // Check for threshold violations and create alerts if needed
    const thresholds = (device.thresholds as any) || {};
    const tempMax = thresholds.tempMax || 60;
    const gasMax = thresholds.gasMax || 500;
    const voltageMax = thresholds.voltageMax || 4.2;
    const voltageMin = thresholds.voltageMin || 3.0;
    const currentMax = thresholds.currentMax || 30;

    const alertPromises: Promise<any>[] = [];

    // Critical threshold checks
    if (data.temperature >= tempMax + 5 || data.gasLevel >= gasMax * 1.5) {
      alertPromises.push(
        prisma.alert.create({
          data: {
            deviceId: data.deviceId,
            type: "CUTOFF",
            reason: `Critical sensor reading: ${data.temperature >= tempMax + 5 ? `Temperature ${data.temperature}°C exceeds critical threshold` : `Gas level ${data.gasLevel}ppm exceeds critical threshold`}`,
            sensorValuesAtTrigger: {
              temperature: data.temperature,
              gasLevel: data.gasLevel,
              voltage: data.voltage,
              current: data.current,
              batteryPercent: data.batteryPercent,
            },
            locationLat: data.locationLat,
            locationLng: data.locationLng,
          },
        })
      );
    } else if (data.temperature >= tempMax || data.gasLevel >= gasMax) {
      alertPromises.push(
        prisma.alert.create({
          data: {
            deviceId: data.deviceId,
            type: "WARNING",
            reason: `Warning threshold exceeded: ${data.temperature >= tempMax ? `Temperature ${data.temperature}°C` : `Gas level ${data.gasLevel}ppm`}`,
            sensorValuesAtTrigger: {
              temperature: data.temperature,
              gasLevel: data.gasLevel,
              voltage: data.voltage,
              current: data.current,
              batteryPercent: data.batteryPercent,
            },
            locationLat: data.locationLat,
            locationLng: data.locationLng,
          },
        })
      );
    }

    // Update device last sync
    alertPromises.push(
      prisma.device.update({
        where: { id: data.deviceId },
        data: {
          lastSyncAt: new Date(),
          connectionStatus: alertPromises.length > 0 ? "CONNECTED" : "CONNECTED",
        },
      })
    );

    await Promise.all(alertPromises);

    return NextResponse.json({
      reading,
      alertsCreated: alertPromises.length - 1, // -1 for device update
    });
  } catch (error) {
    return handleApiError(error);
  }
}
