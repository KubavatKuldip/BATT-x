"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Edit2,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Device {
  id: string;
  serialNumber: string;
  vehicleType: string;
  nickname?: string;
  firmwareVersion: string;
  pairedAt: string;
  lastSyncAt?: string;
  connectionStatus: "CONNECTED" | "DISCONNECTED" | "PAIRING" | "OFFLINE";
}

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if in demo mode
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo') === 'true';
    const demoStorage = sessionStorage.getItem('battx_demo_mode') === 'true';
    setIsDemoMode(demoParam || demoStorage);

    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || data);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to load devices",
          description: "Unable to retrieve your paired devices.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while loading devices.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/devices/${deviceToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "✓ Device Removed",
          description: `${deviceToDelete.nickname || deviceToDelete.serialNumber} has been unpaired.`,
        });

        // Remove from local state
        setDevices(devices.filter(d => d.id !== deviceToDelete.id));
        setDeviceToDelete(null);
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Failed to Remove Device",
          description: data.error || "Unable to unpair this device.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while removing the device.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: Device["connectionStatus"]) => {
    switch (status) {
      case "CONNECTED":
        return <Wifi className="w-4 h-4" style={{ color: 'hsl(var(--ok))' }} />;
      case "DISCONNECTED":
      case "OFFLINE":
        return <WifiOff className="w-4 h-4" style={{ color: 'hsl(var(--ink-4))' }} />;
      case "PAIRING":
        return <Activity className="w-4 h-4 animate-pulse" style={{ color: 'hsl(var(--accent))' }} />;
    }
  };

  const getStatusLabel = (status: Device["connectionStatus"]) => {
    switch (status) {
      case "CONNECTED":
        return "Online";
      case "DISCONNECTED":
        return "Disconnected";
      case "PAIRING":
        return "Pairing...";
      case "OFFLINE":
        return "Offline";
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case "TWO_WHEELER":
        return "2-Wheeler";
      case "THREE_WHEELER":
        return "3-Wheeler";
      case "FOUR_WHEELER":
        return "4-Wheeler";
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg))' }}>
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 animate-spin mx-auto" style={{ color: 'hsl(var(--accent))' }} />
          <p className="font-mono text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Header */}
        <div className="space-y-10">
          <div className="eyebrow">03 — Device Management</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide">
                {devices.length} {devices.length === 1 ? 'DEVICE' : 'DEVICES'} PAIRED
              </div>
            </div>
            <div className="flex items-end justify-between gap-6">
              <h2 className="h-section">
                Your paired <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>devices.</em>
              </h2>
              <Button
                onClick={() => router.push(isDemoMode ? '/devices/pairing?demo=true' : '/devices/pairing')}
                className="gap-2 font-mono text-[12px]"
              >
                <Plus className="w-4 h-4" />
                Add Device
              </Button>
            </div>
          </div>
        </div>

        {/* Devices Grid */}
        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-8">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-medium tracking-tight">No Devices Paired</h3>
              <p className="text-[15px] max-w-[50ch]" style={{ color: 'hsl(var(--ink-3))' }}>
                Pair your BATT-X device to start monitoring battery health, safety alerts, and charging analytics.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => router.push(isDemoMode ? '/devices/pairing?demo=true' : '/devices/pairing')}
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              Pair Your First Device
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <div
                key={device.id}
                className="paper-surface-hover rounded-lg border border-rule p-6 space-y-5"
              >
                {/* Device Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[19px] font-medium tracking-tight truncate">
                        {device.nickname || `Device ${device.serialNumber.slice(-6)}`}
                      </h3>
                      <p className="font-mono text-[11px] mt-1 truncate" style={{ color: 'hsl(var(--ink-4))' }}>
                        {device.serialNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(device.connectionStatus)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium"
                      style={{
                        background: device.connectionStatus === 'CONNECTED'
                          ? 'color-mix(in srgb, hsl(var(--ok)) 15%, transparent)'
                          : 'color-mix(in srgb, hsl(var(--ink-4)) 15%, transparent)',
                        color: device.connectionStatus === 'CONNECTED'
                          ? 'hsl(var(--ok))'
                          : 'hsl(var(--ink-4))',
                      }}
                    >
                      {getStatusLabel(device.connectionStatus)}
                    </span>
                  </div>
                </div>

                {/* Device Details */}
                <div className="space-y-3 py-4 border-y border-rule">
                  <div className="flex items-center justify-between text-[13px]">
                    <span style={{ color: 'hsl(var(--ink-3))' }}>Vehicle Type</span>
                    <span className="font-medium">{getVehicleTypeLabel(device.vehicleType)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span style={{ color: 'hsl(var(--ink-3))' }}>Firmware</span>
                    <span className="font-mono text-[12px]">v{device.firmwareVersion}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span style={{ color: 'hsl(var(--ink-3))' }}>Paired</span>
                    <span className="font-mono text-[12px]">{formatTimestamp(device.pairedAt)}</span>
                  </div>
                  {device.lastSyncAt && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span style={{ color: 'hsl(var(--ink-3))' }}>Last Sync</span>
                      <span className="font-mono text-[12px]">{formatTimestamp(device.lastSyncAt)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard?deviceId=${device.id}`)}
                    className="flex-1 gap-2 font-mono text-[11px]"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeviceToDelete(device)}
                    className="gap-2 font-mono text-[11px]"
                    style={{ color: 'hsl(var(--danger))' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deviceToDelete} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unpair <strong>{deviceToDelete?.nickname || deviceToDelete?.serialNumber}</strong>?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Stop receiving telemetry from this device</li>
                <li>Remove all sensor readings and alerts</li>
                <li>Delete all charge session history</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={isDeleting}
              className="bg-danger hover:bg-danger/90"
            >
              {isDeleting ? "Removing..." : "Remove Device"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
