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

  // Show empty state when no device is paired instead of infinite redirect
  if (!sensorData) {
    return (
      <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
        <div className="max-w-[1240px] mx-auto px-8 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                {t('noPairedDevice') || 'No Vehicle Paired'}
              </h1>
              <p className="text-lg text-muted-foreground max-w-[60ch]">
                {t('noPairedDeviceDescription') || 'Connect your BATT-X device to your vehicle battery to start monitoring live sensor data, safety alerts, and charging analytics.'}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => window.location.href = '/devices/pairing'}
              className="gap-2"
            >
              <Activity className="w-5 h-5" />
              {t('pairVehicle') || 'Pair Vehicle'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate sensor status helpers
  const getTempStatus = () => getSensorStatus(sensorData.temperature, 50, 60);
  const getGasStatus = () => getSensorStatus(sensorData.gasLevel, 0.2, 0.6);
  const getCurrentStatus = () => getSensorStatus(sensorData.current, 20, 30);
  const getVoltStatus = () => {
    if (sensorData.voltage > 58 || sensorData.voltage < 44) return 'critical';
    if (sensorData.voltage > 52 || sensorData.voltage < 46) return 'warning';
    return 'normal';
  };

  // Calculate percentage for progress bars
  const getTempPercent = () => Math.min(100, (sensorData.temperature / 70) * 100);
  const getGasPercent = () => Math.min(100, (sensorData.gasLevel / 1.5) * 100);
  const getCurrentPercent = () => Math.min(100, (sensorData.current / 35) * 100);
  const getVoltPercent = () => Math.min(100, ((sensorData.voltage - 40) / 20) * 100);

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">02 — Live readings</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide">
                UPDATED {lastSyncAt ? lastSyncAt.toTimeString().slice(0, 8) : '--:--:--'} · 4 SENSORS
              </div>
            </div>
            <div>
              <h2 className="h-section">
                What the battery is <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>doing right now.</em>
              </h2>
            </div>
          </div>
        </div>

        {/* Sensor Grid - Editorial Style with proper responsive behavior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {/* Temperature */}
          <SensorCard
            icon={Thermometer}
            label="Battery temperature"
            value={sensorData.temperature.toFixed(1)}
            unit="°C"
            status={getTempStatus()}
            verdict={
              getTempStatus() === 'critical' ? 'Getting hot' :
              getTempStatus() === 'warning' ? 'Warmer than usual' :
              'Comfortable'
            }
            sensorSource="DS18B20"
            safeThreshold="SAFE < 60 °C"
            warnThreshold="WARN ≥ 50 °C"
            percentage={getTempPercent()}
          />

          {/* Gas */}
          <SensorCard
            icon={Wind}
            label="Hydrogen in air"
            value={(sensorData.gasLevel / 100).toFixed(2)}
            unit="%vol"
            status={getGasStatus()}
            verdict={
              getGasStatus() === 'critical' ? 'Detected' :
              getGasStatus() === 'warning' ? 'Traces detected' :
              'Clean air'
            }
            sensorSource="XENSIV TCI-B"
            safeThreshold="SAFE < 0.6"
            warnThreshold="WARN ≥ 0.2 %vol"
            percentage={getGasPercent()}
          />

          {/* Current */}
          <SensorCard
            icon={Activity}
            label="Power being drawn"
            value={sensorData.current.toFixed(1)}
            unit="A"
            status={getCurrentStatus()}
            verdict={
              getCurrentStatus() === 'critical' ? 'High draw' :
              getCurrentStatus() === 'warning' ? 'Drawing more' :
              'Normal draw'
            }
            sensorSource="ACS37800"
            safeThreshold="SAFE < 20 A"
            warnThreshold="WARN ≥ 20 A"
            percentage={getCurrentPercent()}
          />

          {/* Voltage */}
          <SensorCard
            icon={Zap}
            label="Pack voltage"
            value={sensorData.voltage.toFixed(1)}
            unit="V"
            status={getVoltStatus()}
            verdict={
              getVoltStatus() === 'critical' ? 'Out of range' :
              getVoltStatus() === 'warning' ? 'Slightly high' :
              'Healthy'
            }
            sensorSource="divider"
            safeThreshold="SAFE 44–58 V"
            warnThreshold="WARN ≥ 58 V"
            percentage={getVoltPercent()}
          />
        </div>

        {/* Status Header */}
        <StatusHeader
          deviceStatus={deviceStatus}
          connectionStatus={connectionStatus}
          gracePeriodSeconds={gracePeriodSeconds}
          lastSyncAt={lastSyncAt}
        />

        {/* How It Works Section */}
        <section className="mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule mb-12">
            <div className="space-y-3.5">
              <div className="eyebrow">06 — How it works</div>
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                SENSE · DECIDE · RECORD
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Three things, done <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>properly.</em>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-rule">
            <div className="p-9 border-r-0 md:border-r border-b border-rule paper-surface-hover">
              <div className="font-mono text-[11px] text-accent tracking-wide font-medium mb-6">01</div>
              <h4 className="text-[22px] font-medium tracking-tight leading-tight mb-3.5">
                Senses <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>every second.</em>
              </h4>
              <p className="text-[14.5px] leading-relaxed max-w-[34ch]" style={{ color: 'hsl(var(--ink-2))' }}>
                Four channels — hydrogen, temperature, current, and voltage — are sampled continuously. Hydrogen is the earliest precursor, appearing up to 639 seconds before smoke.
              </p>
            </div>

            <div className="p-9 border-r-0 md:border-r border-b border-rule paper-surface-hover">
              <div className="font-mono text-[11px] text-accent tracking-wide font-medium mb-6">02</div>
              <h4 className="text-[22px] font-medium tracking-tight leading-tight mb-3.5">
                Decides <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>with care.</em>
              </h4>
              <p className="text-[14.5px] leading-relaxed max-w-[34ch]" style={{ color: 'hsl(var(--ink-2))' }}>
                Temperature alone is slow. Gas alone can dilute. BATT-x fuses them with rate-of-change logic, then gives the rider a 90-second grace window before any cutoff.
              </p>
            </div>

            <div className="p-9 border-b border-rule paper-surface-hover">
              <div className="font-mono text-[11px] text-accent tracking-wide font-medium mb-6">03</div>
              <h4 className="text-[22px] font-medium tracking-tight leading-tight mb-3.5">
                Records <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>permanently.</em>
              </h4>
              <p className="text-[14.5px] leading-relaxed max-w-[34ch]" style={{ color: 'hsl(var(--ink-2))' }}>
                Every entry is signed with HMAC-SHA256 the moment it is written. If an insurer or workshop needs proof of what the battery experienced, the ledger holds it.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Unit 0042</span>
              <span className="opacity-40">·</span>
              <span>Firmware v1.0.4 · keys in eFuse</span>
              <span className="opacity-40">·</span>
              <span>AES-256-GCM · HMAC-SHA256</span>
              <span className="opacity-40">·</span>
              <span>Rev 2026.09</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
