import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDeviceIngestKey } from "@/lib/api/device-auth";
import { handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const claimDeviceSchema = z.object({
  serialNumber: z.string().min(6).max(50),
});

// POST /api/devices/claim - ESP32 endpoint to claim its deviceId after QR pairing
// Auth: device must present X-Device-Key matching DEVICE_INGEST_SECRET.
//
// Flow:
// 1. ESP32 boots with hardcoded serialNumber (MAC address, etc.)
// 2. ESP32 displays QR code containing serialNumber
// 3. User scans QR in web app → backend creates Device record with CUID
// 4. ESP32 polls this endpoint with serialNumber until 200 response
// 5. Response includes deviceId (CUID) which ESP32 stores in NVS
// 6. Future sensor uploads use stored deviceId
export async function POST(req: NextRequest) {
  try {
    // Verify device authentication
    if (!verifyDeviceIngestKey(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = claimDeviceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { serialNumber } = validation.data;

    // Look up device by serial number
    const device = await prisma.device.findUnique({
      where: { serialNumber },
      select: {
        id: true,
        serialNumber: true,
        nickname: true,
        vehicleType: true,
        userId: true,
        pairedAt: true,
      },
    });

    if (!device) {
      // Device not yet paired - ESP32 should keep polling
      return NextResponse.json(
        {
          paired: false,
          message: "Device not yet paired. Display QR code and wait for user to scan.",
        },
        { status: 404 }
      );
    }

    // Device exists and is paired - return deviceId
    return NextResponse.json({
      paired: true,
      deviceId: device.id,
      serialNumber: device.serialNumber,
      nickname: device.nickname || null,
      vehicleType: device.vehicleType,
      pairedAt: device.pairedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
