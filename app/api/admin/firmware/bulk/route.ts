import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const bulkFirmwareUpdateSchema = z.object({
  targetVersion: z.string().min(1).max(50),
  deviceIds: z.array(z.string()).optional(),
  vehicleType: z.enum(["TWO_WHEELER", "THREE_WHEELER", "FOUR_WHEELER"]).optional(),
  rolloutStrategy: z.enum(["IMMEDIATE", "STAGED", "MANUAL"]).default("STAGED"),
  scheduledAt: z.string().datetime().optional(),
});

// POST /api/admin/firmware/bulk - Schedule bulk firmware update
//
// NOTE: The Prisma `FirmwareUpdate` model in prisma/schema.prisma is a global
// catalog of firmware versions (version, changelog, binaryUrl, status,
// releasedAt) — it has no `deviceId`, `fromVersion`, `toVersion`,
// `scheduledAt`, or `rolloutStrategy` field. The previous implementation
// wrote to fields that don't exist; Prisma silently dropped them, so the
// route reported success while doing nothing. Until a per-device
// `DeviceFirmwareUpdate` (or similar) model is added, we refuse the write
// and return 501 with a clear message.
//
// To finish:
//   1. Add a new model in prisma/schema.prisma that links Device ↔ FirmwareUpdate
//      and stores fromVersion / toVersion / status / scheduledAt / rolloutStrategy.
//   2. Run `prisma migrate dev` to apply the migration.
//   3. Replace the 501 below with the actual create loop, wrapped in a
//      transaction so partial failures roll back.
export async function POST(req: NextRequest) {
  try {
    const result = await requireRole(req, ["ADMIN", "SUPER_ADMIN"]);
    if (result instanceof NextResponse) return result;

    const body = await req.json();
    const validation = bulkFirmwareUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Bulk firmware scheduling is not yet implemented. " +
          "The Prisma FirmwareUpdate model is a version catalog and does not " +
          "support per-device scheduling; see the route file for the plan.",
      },
      { status: 501 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/admin/firmware/bulk - Get firmware update history
export async function GET(req: NextRequest) {
  try {
    const result = await requireRole(req, ["FLEET_MANAGER", "ADMIN", "SUPER_ADMIN"]);
    if (result instanceof NextResponse) return result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [updates, total] = await Promise.all([
      prisma.firmwareUpdate.findMany({
        where,
        orderBy: { releasedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.firmwareUpdate.count({ where }),
    ]);

    return NextResponse.json({
      updates,
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