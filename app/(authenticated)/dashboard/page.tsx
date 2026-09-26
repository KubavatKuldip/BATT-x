"use client";

import { useEffect, useState, useRef } from "react";
import { StatusHeader } from "@/components/dashboard/status-header";
import { SensorCard } from "@/components/dashboard/sensor-card";
import { BatteryCard } from "@/components/dashboard/battery-card";
import { Button } from "@/components/ui/button";
import { Thermometer, Wind, Zap, Activity, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import type { SensorData, DeviceStatus } from "@/lib/types";

// Simulated sensor data for demonstration (fallback when no real device)
const generateMockSensorData = (): SensorData => {
  const temp = 35 + Math.random() * 30; // 35-65°C
  const gas = Math.random() * 100; // 0-100 ppm
  const voltage = 48 + Math.random() * 6; // 48-54V
  const current = Math.random() * 15; // 0-15A
  const battery = 30 + Math.random() * 70; // 30-100%

  return {
    temperature: temp,
    gasLevel: gas,
    voltage,
    current,
    batteryPercent: battery,
    timestamp: new Date(),
  };
};

const getDeviceStatus = (data: SensorData): DeviceStatus => {
  // Critical thresholds
  if (data.temperature > 65 || data.gasLevel > 80 || data.voltage > 54 || data.voltage < 40) {
    return 'cutoff';
  }
  // Warning thresholds
  if (data.temperature > 55 || data.gasLevel > 60 || data.voltage > 52 || data.voltage < 42) {
    return 'warning';
  }
  return 'normal';
};

const getSensorStatus = (value: number, max: number, critical: number): 'normal' | 'warning' | 'critical' => {
  if (value >= critical) return 'critical';
  if (value >= max) return 'warning';
  return 'normal';
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const {
    sensorData,
    deviceStatus,
    connectionStatus,
    gracePeriodSeconds,
    lastSyncAt,
    setSensorData,
    setDeviceStatus,
    setConnectionStatus,
    setGracePeriod,
    setLastSync,
  } = useDashboardStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realDeviceId, setRealDeviceId] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('demo');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use Socket.io hook for real-time updates
  // If no real device, subscribe to "demo-device-1" to receive server demo emissions
  const effectiveDeviceId = realDeviceId || (process.env.NEXT_PUBLIC_SOCKET_URL ? 'demo-device-1' : null);
  const { isConnected: socketConnected, sensorData: socketData } = useSocket(effectiveDeviceId);

  // Handle Socket.io sensor data updates
  useEffect(() => {
    if (socketData) {
      setSensorData(socketData);
      const status = getDeviceStatus(socketData);
      setDeviceStatus(status);
      setLastSync(new Date());
      setConnectionStatus('connected');
      setDataSource(realDeviceId ? 'real' : 'demo');

      // Clear polling if socket is working
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Handle status changes
      if (status === 'warning') {
        setGracePeriod(30);
      } else {
        setGracePeriod(null);
      }

      if (status === 'cutoff') {
        toast({
          variant: "destructive",
          title: "⚠️ Safety Cutoff Triggered",
          description: "Critical threshold exceeded. Charging has been stopped.",
        });
      }
    }
  }, [socketData]);

  // Fetch user's active device on mount
  useEffect(() => {
    const fetchActiveDevice = async () => {
      try {
        const response = await fetch("/api/devices");
        if (response.ok) {
          const data = await response.json();
          const activeDevice = data.devices?.find((d: any) => d.connectionStatus === "CONNECTED") || data.devices?.[0];

          if (activeDevice) {
            setRealDeviceId(activeDevice.id);

            // Try to fetch latest reading
            const readingResponse = await fetch(`/api/devices/${activeDevice.id}/latest-reading`);
            if (readingResponse.ok) {
              const readingData = await readingResponse.json();
              if (readingData.reading) {
                const r = readingData.reading;
                setSensorData({
                  temperature: r.temperature,
                  gasLevel: r.gasLevel,
                  voltage: r.voltage,
                  current: r.current,
                  batteryPercent: r.batteryPercent,
                  timestamp: new Date(r.timestamp),
                });
                setDeviceStatus(getDeviceStatus({
                  temperature: r.temperature,
                  gasLevel: r.gasLevel,
                  voltage: r.voltage,
                  current: r.current,
                  batteryPercent: r.batteryPercent,
                  timestamp: new Date(r.timestamp),
                }));
                setDataSource('real');
                setConnectionStatus('connected');
                setLastSync(new Date());
              }
            }

            // Start polling as fallback (will be replaced by Socket.io if available)
            // Socket.io updates will clear this interval
            setTimeout(() => {
              if (!socketConnected) {
                console.log('Socket not connected, starting HTTP polling fallback');
                startPolling(activeDevice.id);
              }
            }, 2000); // Give Socket.io 2 seconds to connect
          } else {
            // No real device, use demo data
            startDemoMode();
          }
        }
      } catch (error) {
        console.error("Failed to fetch devices, falling back to demo:", error);
        startDemoMode();
      }
    };

    fetchActiveDevice();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startDemoMode = () => {
    setDataSource('demo');
    setConnectionStatus('connected');

    const interval = setInterval(() => {
      const newData = generateMockSensorData();
      setSensorData(newData);
      const status = getDeviceStatus(newData);
      setDeviceStatus(status);

      if (status === 'warning') {
        setGracePeriod(30);
      } else {
        setGracePeriod(null);
      }

      if (status === 'cutoff') {
        toast({
          variant: "destructive",
          title: "⚠️ Safety Cutoff Triggered",
          description: "Critical threshold exceeded. Charging has been stopped.",
        });
      }
    }, 5000);

    // Initial data
    const initialData = generateMockSensorData();
    setSensorData(initialData);
    setDeviceStatus(getDeviceStatus(initialData));

    // Save interval for cleanup
    pollIntervalRef.current = interval;
  };

  const startPolling = (deviceId: string) => {
    // Poll for new readings every 5 seconds
    // In production, this would be a WebSocket/Socket.io connection
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/devices/${deviceId}/latest-reading`);
        if (response.ok) {
          const data = await response.json();
          if (data.reading) {
            const r = data.reading;
            const newData: SensorData = {
              temperature: r.temperature,
              gasLevel: r.gasLevel,
              voltage: r.voltage,
              current: r.current,
              batteryPercent: r.batteryPercent,
              timestamp: new Date(r.timestamp),
            };
            setSensorData(newData);
            setDeviceStatus(getDeviceStatus(newData));
            setLastSync(new Date());
            setConnectionStatus('connected');
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        setConnectionStatus('reconnecting');
      }
    }, 5000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    if (dataSource === 'real' && realDeviceId) {
      try {
        const response = await fetch(`/api/devices/${realDeviceId}/latest-reading`);
        if (response.ok) {
          const data = await response.json();
          if (data.reading) {
            const r = data.reading;
            setSensorData({
              temperature: r.temperature,
              gasLevel: r.gasLevel,
              voltage: r.voltage,
              current: r.current,
              batteryPercent: r.batteryPercent,
              timestamp: new Date(r.timestamp),
            });
            setDeviceStatus(getDeviceStatus({
              temperature: r.temperature,
              gasLevel: r.gasLevel,
              voltage: r.voltage,
              current: r.current,
              batteryPercent: r.batteryPercent,
              timestamp: new Date(r.timestamp),
            }));
            setLastSync(new Date());
          }
        }
      } catch (error) {
        // Fallback to mock on error
        const newData = generateMockSensorData();
        setSensorData(newData);
        setDeviceStatus(getDeviceStatus(newData));
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newData = generateMockSensorData();
      setSensorData(newData);
      setDeviceStatus(getDeviceStatus(newData));
    }

    setIsRefreshing(false);

    toast({
      title: `✓ ${t('synced')}`,
      description: dataSource === 'real' ? "Latest sensor data from device" : "Demo data refreshed",
    });
  };

  if (!sensorData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">{t('redirecting')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with device selector and sync button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1">{t('title')}</h1>
            <p className="text-body text-muted-foreground mt-1">
              {t('description')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 text-caption text-muted-foreground"
              // aria-live so a screen reader announces the transition
              // (e.g. "Demo" → "Offline" → "Live") without focus.
              aria-live="polite"
            >
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 text-success" aria-hidden="true" />
                  <span>
                    {dataSource === 'real'
                      ? (socketConnected ? t('liveWebSocket') : t('livePolling'))
                      : (socketConnected ? t('demoWebSocket') : t('demo'))}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                  <span>{t('offline')}</span>
                </>
              )}
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="lg"
              aria-label={t('syncNow')}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {t('syncNow')}
            </Button>
          </div>
        </div>

        {/* Status Header */}
        <StatusHeader
          deviceStatus={deviceStatus}
          connectionStatus={connectionStatus}
          gracePeriodSeconds={gracePeriodSeconds}
          lastSyncAt={lastSyncAt}
        />

        {/* Sensor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Battery Card - spans 2 columns on larger screens */}
          <div className="sm:col-span-2 lg:col-span-1">
            <BatteryCard
              percentage={sensorData.batteryPercent}
              isCharging={sensorData.current > 1}
              status={
                sensorData.batteryPercent < 20
                  ? 'critical'
                  : sensorData.batteryPercent < 40
                  ? 'warning'
                  : 'normal'
              }
            />
          </div>

          {/* Temperature */}
          <SensorCard
            icon={Thermometer}
            label="Temperature"
            value={sensorData.temperature.toFixed(1)}
            unit="°C"
            status={getSensorStatus(sensorData.temperature, 55, 65)}
          />

          {/* Voltage */}
          <SensorCard
            icon={Zap}
            label="Voltage"
            value={sensorData.voltage.toFixed(2)}
            unit="V"
            status={
              sensorData.voltage > 54 || sensorData.voltage < 40
                ? 'critical'
                : sensorData.voltage > 52 || sensorData.voltage < 42
                ? 'warning'
                : 'normal'
            }
          />

          {/* Current */}
          <SensorCard
            icon={Activity}
            label="Current"
            value={sensorData.current.toFixed(2)}
            unit="A"
            status={getSensorStatus(sensorData.current, 12, 15)}
          />

          {/* Gas Level */}
          <SensorCard
            icon={Wind}
            label="Gas Level"
            value={sensorData.gasLevel.toFixed(0)}
            unit="ppm"
            status={getSensorStatus(sensorData.gasLevel, 60, 80)}
          />
        </div>
      </div>
    </div>
  );
}
