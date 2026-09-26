import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api/middleware";

// GET /api/admin/analytics - Get fleet analytics
export async function GET(req: NextRequest) {
  try {
    const result = await requireRole(req, ["FLEET_MANAGER", "ADMIN", "SUPER_ADMIN"]);
    if (result instanceof NextResponse) return result;

    const [
      totalUsers,
      totalDevices,
      onlineDevices,
      activeAlerts,
      last30Days,
      totalChargeSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.device.count(),
      prisma.device.count({ where: { connectionStatus: "CONNECTED" } }),
      prisma.alert.count({ where: { resolvedAt: null } }),
      prisma.alert.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.chargeSession.count(),
    ]);

    // Device health distribution
    const deviceStatusGroups = await prisma.device.groupBy({
      by: ["connectionStatus"],
      _count: { connectionStatus: true },
    });

    // Vehicle type distribution
    const vehicleTypeGroups = await prisma.device.groupBy({
      by: ["vehicleType"],
      _count: { vehicleType: true },
    });

    // Alert type distribution
    const alertTypeGroups = await prisma.alert.groupBy({
      by: ["type"],
      _count: { type: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    // Top users by device count
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { devices: true } },
      },
      orderBy: {
        devices: { _count: "desc" },
      },
      take: 10,
    });

    // Recent alerts
    const recentAlerts = await prisma.alert.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        device: {
          select: { serialNumber: true, nickname: true, vehicleType: true },
        },
      },
    });

    // Daily alert trend (last 30 days)
    const dailyAlerts = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Alert"
      WHERE "createdAt" >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return NextResponse.json({
      summary: {
        totalUsers,
        totalDevices,
        onlineDevices,
        activeAlerts,
        alertsLast30Days: last30Days,
        totalChargeSessions,
      },
      deviceStatusDistribution: deviceStatusGroups.map((g) => ({
        status: g.connectionStatus,
        count: g._count.connectionStatus,
      })),
      vehicleTypeDistribution: vehicleTypeGroups.map((g) => ({
        vehicleType: g.vehicleType,
        count: g._count.vehicleType,
      })),
      alertTypeDistribution: alertTypeGroups.map((g) => ({
        type: g.type,
        count: g._count.type,
      })),
      topUsers: topUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        deviceCount: u._count.devices,
      })),
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        reason: a.reason,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
        device: a.device,
      })),
      dailyAlertTrend: dailyAlerts.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}