import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateQuery, handleApiError, checkOwnership } from "@/lib/api/middleware";
import { alertFilterSchema } from "@/lib/validations/api";

// GET /api/alerts - Get alerts with filtering
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = validateQuery(req, alertFilterSchema);
    if (validation instanceof NextResponse) return validation;

    const { page, limit, type, search, startDate, endDate } = validation.data;
    const skip = (page - 1) * limit;

    // Get user's devices
    const userDevices = await prisma.device.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const deviceIds = userDevices.map(d => d.id);

    // Build where clause
    const where: any = {
      deviceId: { in: deviceIds },
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.reason = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          device: {
            select: {
              nickname: true,
              serialNumber: true,
              vehicleType: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
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
