import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const pairDeviceSchema = z.object({
  serialNumber: z.string().min(6).max(50),
  vehicleType: z.enum(["TWO_WHEELER", "THREE_WHEELER", "FOUR_WHEELER"]),
  nickname: z.string().min(1).max(100).optional(),
});

// POST /api/devices/pair - Register and pair a new device
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const body = await req.json();
    const validation = pairDeviceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { serialNumber, vehicleType, nickname } = validation.data;

    // Check if device with this serial number already exists
    const existingDevice = await prisma.device.findUnique({
      where: { serialNumber },
    });

    if (existingDevice) {
      // If device exists but is already paired to another user
      if (existingDevice.userId && existingDevice.userId !== user.id) {
        return NextResponse.json(
          { error: "This device is already paired to another account" },
          { status: 409 }
        );
      }

      // If device exists but is paired to current user, update it
      if (existingDevice.userId === user.id) {
        const updated = await prisma.device.update({
          where: { id: existingDevice.id },
          data: {
            vehicleType,
            nickname: nickname || existingDevice.nickname,
            connectionStatus: "CONNECTED",
            lastSyncAt: new Date(),
          },
        });

        // Log the re-pairing activity
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "device.re-paired",
            details: {
              deviceId: updated.id,
              serialNumber: updated.serialNumber,
              nickname: updated.nickname,
            },
          },
        });

        return NextResponse.json({
          device: updated,
          message: "Device re-paired successfully",
        });
      }
    }

    // Create new device and pair it to user.
    // Thresholds match the pack-scale defaults used by app/api/devices/route.ts
    // (the previous 4.2V/3.0V were cell-scale and incompatible with the
    // sensor stream which writes pack voltage in volts).
    const device = await prisma.device.create({
      data: {
        userId: user.id,
        serialNumber,
        vehicleType,
        nickname,
        connectionStatus: "CONNECTED",
        firmwareVersion: "1.0.0",
        thresholds: {
          tempMax: 60,
          tempMin: 0,
          gasMax: 500,
          voltageMax: 54,
          voltageMin: 40,
          currentMax: 15,
        },
        lastSyncAt: new Date(),
      },
    });

    // Log the pairing activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "device.paired",
        details: {
          deviceId: device.id,
          serialNumber: device.serialNumber,
          vehicleType: device.vehicleType,
          nickname: device.nickname,
        },
      },
    });

    return NextResponse.json(
      {
        device,
        message: "Device paired successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
