import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";

// GET /api/analytics - Get user's analytics data
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7", 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get user's devices
    const userDevices = await prisma.device.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const deviceIds = userDevices.map(d => d.id);

    if (deviceIds.length === 0) {
      // No devices, return empty data structure
      return NextResponse.json({
        chartData: [],
        chargeSessions: [],
        hasData: false,
      });
    }

    // Get sensor readings aggregated by day
    const readings = await prisma.sensorReading.findMany({
      where: {
        deviceId: { in: deviceIds },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
        temperature: true,
        voltage: true,
        batteryPercent: true,
        current: true,
        isTampered: true,
      },
      orderBy: { timestamp: "asc" },
    });

    // Aggregate sensor data by day
    const dailyData = new Map<string, {
      date: string;
      timestamp: number;
      temperatures: number[];
      voltages: number[];
      batteries: number[];
      currents: number[];
      verified: boolean[];
    }>();

    readings.forEach((reading) => {
      const dateKey = reading.timestamp.toISOString().split('T')[0];

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          timestamp: new Date(dateKey).getTime(),
          temperatures: [],
          voltages: [],
          batteries: [],
          currents: [],
          verified: [],
        });
      }

      const day = dailyData.get(dateKey)!;
      day.temperatures.push(reading.temperature);
      day.voltages.push(reading.voltage);
      day.batteries.push(reading.batteryPercent);
      day.currents.push(reading.current);
      day.verified.push(!reading.isTampered);
    });

    // Calculate averages for each day
    const chartData = Array.from(dailyData.values()).map(day => ({
      date: new Date(day.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: day.timestamp,
      battery: day.batteries.length > 0
        ? day.batteries.reduce((a, b) => a + b, 0) / day.batteries.length
        : null,
      temperature: day.temperatures.length > 0
        ? day.temperatures.reduce((a, b) => a + b, 0) / day.temperatures.length
        : null,
      voltage: day.voltages.length > 0
        ? day.voltages.reduce((a, b) => a + b, 0) / day.voltages.length
        : null,
      current: day.currents.length > 0
        ? day.currents.reduce((a, b) => a + b, 0) / day.currents.length
        : null,
      verified: day.verified.length > 0
        ? day.verified.filter(v => v).length / day.verified.length >= 0.9
        : true,
    }));

    // Get recent charging sessions
    const chargeSessions = await prisma.chargeSession.findMany({
      where: {
        deviceId: { in: deviceIds },
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { startTime: "desc" },
      take: 10,
      include: {
        device: {
          select: {
            nickname: true,
            serialNumber: true,
          },
        },
      },
    });

    // Transform charge sessions
    const transformedSessions = chargeSessions.map(session => ({
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      startBattery: session.startBattery,
      endBattery: session.endBattery,
      avgTemp: session.avgTemp,
      maxVoltage: session.maxVoltage,
      device: session.device,
      // Check if readings during this session were tampered
      verified: true, // Default to true, will be refined by checking readings if needed
    }));

    return NextResponse.json({
      chartData,
      chargeSessions: transformedSessions,
      hasData: readings.length > 0 || chargeSessions.length > 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
