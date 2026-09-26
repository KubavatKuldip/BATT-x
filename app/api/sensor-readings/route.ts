import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, validateQuery, handleApiError } from "@/lib/api/middleware";
import { verifyDeviceIngestKey } from "@/lib/api/device-auth";
import { sensorReadingCreateSchema, sensorReadingFilterSchema } from "@/lib/validations/api";
import crypto from "crypto";

// GET /api/sensor-readings - Get sensor readings with filtering
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = validateQuery(req, sensorReadingFilterSchema);
    if (validation instanceof NextResponse) return validation;

    const { page, limit, deviceId, startDate, endDate } = validation.data;
    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {};

    if (deviceId) {
      // Verify user owns this device
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device || device.userId !== user.id) {
        return NextResponse.json(
          { error: "Device not found or access denied" },
          { status: 403 }
        );
      }

      where.deviceId = deviceId;
    } else {
      // Get all user's devices
      const userDevices = await prisma.device.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      where.deviceId = { in: userDevices.map(d => d.id) };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [readings, total] = await Promise.all([
      prisma.sensorReading.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
        select: {
          id: true,
          deviceId: true,
          temperature: true,
          gasLevel: true,
          voltage: true,
          current: true,
          batteryPercent: true,
          isTampered: true,
          locationLat: true,
          locationLng: true,
          timestamp: true,
        },
      }),
      prisma.sensorReading.count({ where }),
    ]);

    return NextResponse.json({
      readings,
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

// POST /api/sensor-readings - Ingest sensor data (IoT device endpoint)
// Auth: device must present X-Device-Key matching DEVICE_INGEST_SECRET.
// (User session auth was removed: it doesn't represent the device identity
// and previously allowed any logged-in user to write readings for any device.)
export async function POST(req: NextRequest) {
  try {
    if (!verifyDeviceIngestKey(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validation = await validateBody(req, sensorReadingCreateSchema);
    if (validation instanceof NextResponse) return validation;

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

    // Verify data integrity
    const dataString = JSON.stringify({
      temperature: data.temperature,
      gasLevel: data.gasLevel,
      voltage: data.voltage,
      current: data.current,
      batteryPercent: data.batteryPercent,
    });

    const expectedHash = crypto
      .createHash("sha256")
      .update(dataString)
      .digest("hex");

    const isTampered = data.integrityHash !== expectedHash;

    // Create sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        ...data,
        isTampered,
      },
    });

    // Update device last sync
    await prisma.device.update({
      where: { id: data.deviceId },
      data: { lastSyncAt: new Date(), connectionStatus: "CONNECTED" },
    });

    // Check thresholds and create alerts if needed
    const thresholds = device.thresholds as any;
    const shouldAlert =
      data.temperature > thresholds.tempMax ||
      data.temperature < thresholds.tempMin ||
      data.gasLevel > thresholds.gasMax ||
      data.voltage > thresholds.voltageMax ||
      data.voltage < thresholds.voltageMin ||
      data.current > thresholds.currentMax;

    if (shouldAlert) {
      const reasons = [];
      if (data.temperature > thresholds.tempMax)
        reasons.push(`Temperature (${data.temperature}°C) exceeded maximum (${thresholds.tempMax}°C)`);
      if (data.gasLevel > thresholds.gasMax)
        reasons.push(`Gas level (${data.gasLevel} ppm) exceeded maximum (${thresholds.gasMax} ppm)`);
      if (data.voltage > thresholds.voltageMax)
        reasons.push(`Voltage (${data.voltage}V) exceeded maximum (${thresholds.voltageMax}V)`);

      const alertType =
        data.temperature > thresholds.tempMax + 10 ||
        data.gasLevel > thresholds.gasMax + 20 ||
        data.voltage > thresholds.voltageMax + 2
          ? "CUTOFF"
          : "WARNING";

      await prisma.alert.create({
        data: {
          deviceId: data.deviceId,
          type: alertType,
          reason: reasons.join("; "),
          sensorValuesAtTrigger: data,
          locationLat: data.locationLat,
          locationLng: data.locationLng,
        },
      });
    }

    // Bridge: emit sensor data to Socket.io for real-time dashboard updates.
    // Fire-and-forget — a failure here must not block the 201 response.
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
      const deviceKey = process.env.DEVICE_INGEST_SECRET;
      if (deviceKey) {
        fetch(`${socketUrl}/emit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Key": deviceKey,
          },
          body: JSON.stringify({
            deviceId: data.deviceId,
            sensorData: {
              temperature: data.temperature,
              gasLevel: data.gasLevel,
              voltage: data.voltage,
              current: data.current,
              batteryPercent: data.batteryPercent,
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch((err) => {
          console.error("[sensor-readings] Socket.io emit failed (non-fatal):", err.message);
        });
      }
    } catch {
      // Swallow — real-time push is best-effort; polling fallback covers it.
    }

    return NextResponse.json(reading, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
