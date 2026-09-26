"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface SensorCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  className?: string;
}

const statusColors = {
  normal: 'text-success',
  warning: 'text-warning',
  critical: 'text-danger',
};

const statusBgColors = {
  normal: 'bg-success/10',
  warning: 'bg-warning/10',
  critical: 'bg-danger/10',
};

export function SensorCard({ icon: Icon, label, value, unit, status, className }: SensorCardProps) {
  // Surface the reading as one accessible string so the screen reader doesn't
  // have to stitch together "Temperature" + "35.4" + "°C" + "warning" from
  // disconnected spans. The visible text is unchanged.
  const accessibleName = `${label}: ${value} ${unit}, ${status}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        level={2}
        className={cn("p-6 transition-all hover:shadow-clay-lg", className)}
        role="group"
        aria-label={accessibleName}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn("p-3 rounded-lg", statusBgColors[status])}
            aria-hidden="true"
          >
            <Icon className={cn("w-5 h-5", statusColors[status])} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-body-sm text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={value}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "text-heading-2 font-semibold tabular-nums",
                statusColors[status]
              )}
            >
              {value}
            </motion.span>
            <span className="text-body text-muted-foreground">{unit}</span>
          </div>
          {/*
            Status text is duplicated here (visually hidden) so a screen reader
            who focuses the number still hears "warning" / "critical". The
            color is no longer the only signal.
          */}
          <p className="sr-only">Status: {status}</p>
        </div>
      </Card>
    </motion.div>
  );
}
