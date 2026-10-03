// Quick diagnostic: Check production device and user association
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check demo user
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@battx.com' },
      select: { id: true, email: true }
    });

    if (!demoUser) {
      return Response.json({ error: 'Demo user not found' }, { status: 404 });
    }

    // Check all devices
    const allDevices = await prisma.device.findMany({
      select: {
        id: true,
        userId: true,
        serialNumber: true,
        connectionStatus: true,
        lastSyncAt: true,
      },
      orderBy: { lastSyncAt: 'desc' },
      take: 10,
    });

    // Check devices owned by demo user
    const demoDevices = await prisma.device.findMany({
      where: { userId: demoUser.id },
      select: {
        id: true,
        serialNumber: true,
        connectionStatus: true,
        lastSyncAt: true,
      }
    });

    // Check latest sensor readings
    const latestReadings = await prisma.sensorReading.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        deviceId: true,
        temperature: true,
        gasLevel: true,
        voltage: true,
        current: true,
        batteryPercent: true,
        timestamp: true,
      }
    });

    return Response.json({
      demoUser: { id: demoUser.id, email: demoUser.email },
      demoDevices,
      allDevices,
      latestReadings,
      diagnosis: {
        hasDemoUser: !!demoUser,
        demoDeviceCount: demoDevices.length,
        connectedDemoDevice: demoDevices.find(d => d.connectionStatus === 'CONNECTED'),
        totalDevices: allDevices.length,
      }
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
