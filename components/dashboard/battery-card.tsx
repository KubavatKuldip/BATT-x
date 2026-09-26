"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Battery, BatteryCharging } from "lucide-react";
import { motion } from "framer-motion";

interface BatteryCardProps {
  percentage: number;
  isCharging?: boolean;
  status: 'normal' | 'warning' | 'critical';
  className?: string;
}

export function BatteryCard({ percentage, isCharging = false, status, className }: BatteryCardProps) {
  const statusColors = {
    normal: 'text-success',
    warning: 'text-warning',
    critical: 'text-danger',
  };

  const statusStrokeColors = {
    normal: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    critical: '#ef4444', // rose-500
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // The SVG progress ring is decorative — the visible text "NN%" below is
  // the source of truth for assistive tech, so we mark the SVG aria-hidden.
  // The whole card is grouped with role="group" and an accessible name so a
  // screen reader hears "Battery Level, 80 percent, normal, charging in
  // progress" instead of a list of disconnected spans.
  const accessibleName = `Battery level ${Math.round(percentage)} percent, ${status}${
    isCharging ? ", charging" : ""
  }`;

  return (
    <Card
      level={2}
      className={cn("p-6", className)}
      role="group"
      aria-label={accessibleName}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <svg
            className="transform -rotate-90"
            width="160"
            height="160"
            aria-hidden="true"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted opacity-20"
            />
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke={statusStrokeColors[status]}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeInOut" }}
              style={{
                strokeDasharray: circumference,
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              aria-hidden="true"
            >
              {isCharging ? (
                <BatteryCharging className={cn("w-8 h-8 mb-2", statusColors[status])} />
              ) : (
                <Battery className={cn("w-8 h-8 mb-2", statusColors[status])} />
              )}
            </motion.div>
            <motion.span
              key={percentage}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn("text-3xl font-bold tabular-nums", statusColors[status])}
            >
              <span className="sr-only">Battery: </span>
              {Math.round(percentage)}%
            </motion.span>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-body font-medium">Battery Level</p>
          {isCharging && (
            <p className="text-body-sm text-muted-foreground">Charging in progress</p>
          )}
        </div>
      </div>
    </Card>
  );
}
