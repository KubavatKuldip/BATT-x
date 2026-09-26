import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const insuranceReportSchema = z.object({
  deviceId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeAlerts: z.boolean().default(true),
  includeChargeSessions: z.boolean().default(true),
  includeSensorReadings: z.boolean().default(false),
  format: z.enum(["JSON", "PDF"]).default("JSON"),
});

// POST /api/alerts/insurance-report - Generate insurance report
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await req.json();
    const parseResult = insuranceReportSchema.safeParse(validation);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { deviceId, startDate, endDate, includeAlerts, includeChargeSessions, includeSensorReadings, format } = parseResult.data;

    // Verify device belongs to user
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId: user.id,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found or unauthorized" },
        { status: 404 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch alerts
    let alerts: any[] = [];
    if (includeAlerts) {
      alerts = await prisma.alert.findMany({
        where: {
          deviceId,
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Fetch charge sessions
    let chargeSessions: any[] = [];
    if (includeChargeSessions) {
      chargeSessions = await prisma.chargeSession.findMany({
        where: {
          deviceId,
          startTime: { gte: start, lte: end },
        },
        orderBy: { startTime: "desc" },
      });
    }

    // Fetch sensor readings (sampled for report size)
    let sensorReadings: any[] = [];
    if (includeSensorReadings) {
      sensorReadings = await prisma.sensorReading.findMany({
        where: {
          deviceId,
          timestamp: { gte: start, lte: end },
        },
        orderBy: { timestamp: "desc" },
        take: 1000, // Limit for report size
      });
    }

    // Calculate statistics
    const warningAlerts = alerts.filter((a) => a.type === "WARNING").length;
    const cutoffAlerts = alerts.filter((a) => a.type === "CUTOFF").length;
    const resolvedAlerts = alerts.filter((a) => a.resolvedAt !== null).length;

    const totalChargeSessions = chargeSessions.length;
    const completedSessions = chargeSessions.filter((s) => s.endTime !== null).length;
    const avgChargeTime = completedSessions > 0
      ? chargeSessions
          .filter((s) => s.endTime)
          .reduce((acc, s) => acc + (new Date(s.endTime!).getTime() - new Date(s.startTime).getTime()), 0) / completedSessions
      : 0;

    const totalEnergyCharged = chargeSessions
      .filter((s) => s.endBattery !== null && s.startBattery !== null)
      .reduce((acc, s) => acc + (s.endBattery! - s.startBattery!), 0);

    // Temperature extremes
    const temps = sensorReadings.map((s) => s.temperature).filter((t) => t !== null);
    const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
    const minTemp = temps.length > 0 ? Math.min(...temps) : null;

    // Gas level extremes
    const gasLevels = sensorReadings.map((s) => s.gasLevel).filter((g) => g !== null);
    const maxGas = gasLevels.length > 0 ? Math.max(...gasLevels) : null;

    // Voltage extremes
    const voltages = sensorReadings.map((s) => s.voltage).filter((v) => v !== null);
    const maxVoltage = voltages.length > 0 ? Math.max(...voltages) : null;
    const minVoltage = voltages.length > 0 ? Math.min(...voltages) : null;

    // Compile report
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
        reportPeriod: { start: startDate, end: endDate },
        format,
      },
      device: {
        serialNumber: device.serialNumber,
        nickname: device.nickname,
        vehicleType: device.vehicleType,
        firmwareVersion: device.firmwareVersion,
      },
      summary: {
        periodDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        totalAlerts: alerts.length,
        warningAlerts,
        cutoffAlerts,
        sosAlerts: alerts.filter((a) => (a.sensorValuesAtTrigger as any)?.isSOS).length,
        resolvedAlerts,
        totalChargeSessions,
        completedChargeSessions,
        avgChargeTimeMinutes: Math.round(avgChargeTime / (1000 * 60)),
        totalEnergyChargedPercent: Math.round(totalEnergyCharged),
        sensorReadingsAnalyzed: sensorReadings.length,
      },
      safetyMetrics: {
        temperatureRange: { min: minTemp, max: maxTemp, threshold: device.thresholds?.tempMax || 60 },
        gasLevelMax: { value: maxGas, threshold: device.thresholds?.gasMax || 500 },
        voltageRange: { min: minVoltage, max: maxVoltage, thresholdMax: device.thresholds?.voltageMax || 4.2, thresholdMin: device.thresholds?.voltageMin || 3.0 },
      },
      alerts: includeAlerts ? alerts : undefined,
      chargeSessions: includeChargeSessions ? chargeSessions : undefined,
      sensorReadings: includeSensorReadings ? sensorReadings : undefined,
    };

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "insurance_report.generated",
        details: {
          deviceId,
          period: { start: startDate, end: endDate },
          format,
          alertsIncluded: includeAlerts,
          sessionsIncluded: includeChargeSessions,
        },
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}