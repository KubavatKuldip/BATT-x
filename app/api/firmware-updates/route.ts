import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";

// GET /api/firmware-updates - Get available firmware updates
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const updates = await prisma.firmwareUpdate.findMany({
      where: {
        status: { in: ["available", "critical"] },
      },
      orderBy: { releasedAt: "desc" },
      take: 10,
    });

    return NextResponse.json(updates);
  } catch (error) {
    return handleApiError(error);
  }
}
