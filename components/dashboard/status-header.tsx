"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircleCheck, AlertTriangle, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import type { DeviceStatus, ConnectionStatus } from "@/lib/types";
import { useState, useEffect } from "react";
import { formatTimeOnly } from "@/lib/utils/date-format";

interface StatusHeaderProps {
  deviceStatus: DeviceStatus;
  connectionStatus: ConnectionStatus;
  gracePeriodSeconds: number | null;
  lastSyncAt: Date | null;
}

export function StatusHeader({
  deviceStatus,
  connectionStatus,
  gracePeriodSeconds,
  lastSyncAt
}: StatusHeaderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getStatusConfig = () => {
    switch (deviceStatus) {
      case 'normal':
        return {
          icon: CircleCheck,
          text: 'Normal',
          description: 'All systems operating normally',
          variant: 'success' as const,
          bgColor: 'bg-success/10',
          textColor: 'text-success',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          text: 'Warning',
          description: gracePeriodSeconds
            ? `Grace period: ${gracePeriodSeconds}s remaining`
            : 'Threshold exceeded - monitoring',
          variant: 'warning' as const,
          bgColor: 'bg-warning/10',
          textColor: 'text-warning',
        };
      case 'cutoff':
        return {
          icon: ShieldAlert,
          text: 'Cutoff Active',
          description: 'Safety cutoff triggered - charging stopped',
          variant: 'destructive' as const,
          bgColor: 'bg-danger/10',
          textColor: 'text-danger',
        };
    }
  };

  const getConnectionConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: Wifi, text: 'Connected', color: 'text-success' };
      case 'disconnected':
        return { icon: WifiOff, text: 'Disconnected', color: 'text-muted-foreground' };
      case 'pairing':
        return { icon: Wifi, text: 'Pairing...', color: 'text-warning' };
      case 'offline':
        return { icon: WifiOff, text: 'Offline', color: 'text-muted-foreground' };
    }
  };

  const statusConfig = getStatusConfig();
  const connectionConfig = getConnectionConfig();
  const StatusIcon = statusConfig.icon;
  const ConnectionIcon = connectionConfig.icon;

  return (
    <Card
      level={3}
      className="p-6 mb-6"
      // aria-live=polite so a screen reader announces when the device
      // transitions to warning / cutoff, but only when the user is idle —
      // polite (not assertive) avoids interrupting the user mid-task.
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Device status: ${statusConfig.text}. ${statusConfig.description}. ${connectionConfig.text}.`}
    >
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={cn("p-4 rounded-xl", statusConfig.bgColor)}
            aria-hidden="true"
          >
            <StatusIcon className={cn("w-8 h-8", statusConfig.textColor)} />
          </motion.div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className={cn("text-heading-3", statusConfig.textColor)}>
                {statusConfig.text}
              </h2>
              <Badge variant={statusConfig.variant}>
                <span className="sr-only">Status: </span>
                {deviceStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-body-sm text-muted-foreground">
              {statusConfig.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <ConnectionIcon
                className={cn("w-4 h-4", connectionConfig.color)}
                aria-hidden="true"
              />
              <span className={cn("text-body-sm font-medium", connectionConfig.color)}>
                {connectionConfig.text}
              </span>
            </div>
            {lastSyncAt && (
              <p className="text-caption text-muted-foreground">
                Last synced:{" "}
                <time dateTime={new Date(lastSyncAt).toISOString()}>
                  {isClient ? new Date(lastSyncAt).toLocaleTimeString() : formatTimeOnly(lastSyncAt)}
                </time>
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
