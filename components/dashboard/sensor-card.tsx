"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SensorCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  className?: string;
  // Reference design additional props
  verdict?: string;
  safeThreshold?: string;
  warnThreshold?: string;
  sensorSource?: string;
  percentage?: number;
}

const statusClasses = {
  normal: '',
  warning: 'warn',
  critical: 'crit',
};

export function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  status,
  verdict,
  safeThreshold,
  warnThreshold,
  sensorSource,
  percentage = 50,
  className
}: SensorCardProps) {
  const accessibleName = `${label}: ${value} ${unit}, ${status}${verdict ? `, ${verdict}` : ''}`;

  return (
    <div
      className={cn(
        "reading paper-surface-hover rounded-lg border border-rule transition-colors",
        statusClasses[status],
        className
      )}
      role="group"
      aria-label={accessibleName}
    >
      {/* Label */}
      <div className="label flex justify-between items-baseline gap-2 mb-5">
        <span className="smallcaps">{label}</span>
        {sensorSource && (
          <span className="font-mono text-[9px] text-ink-4 tracking-wider uppercase overflow-hidden text-ellipsis whitespace-nowrap">
            {sensorSource}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="value flex items-baseline gap-1.5 mb-3.5 transition-colors duration-350">
        <span className="num font-mono text-[38px] font-light leading-none tracking-tight tabular-nums transition-colors duration-350">
          {value}
        </span>
        <span className="unit font-mono text-[13px] text-ink-3 font-normal tracking-wide">
          {unit}
        </span>
      </div>

      {/* Verdict */}
      {verdict && (
        <div className="verdict text-[14px] font-medium text-ink-2 leading-snug mb-4 min-h-[20px]">
          {verdict}
        </div>
      )}

      {/* Progress Bar */}
      <div className="bar h-0.5 bg-rule-soft relative overflow-hidden mb-3.5">
        <i
          className="absolute inset-y-0 left-0 bg-accent transition-all duration-600 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          aria-hidden="true"
        />
        {/* Optional threshold marker */}
        {warnThreshold && (
          <span
            className="mark absolute top-[-2px] bottom-[-2px] w-px bg-ink-4"
            style={{ left: '60%' }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Footer with thresholds */}
      {(safeThreshold || warnThreshold) && (
        <div className="foot font-mono text-[10px] text-ink-4 tracking-wide">
          {safeThreshold} {warnThreshold && `· ${warnThreshold}`}
        </div>
      )}

      {/* Screen reader status */}
      <p className="sr-only">Status: {status}</p>

      <style jsx>{`
        .reading.warn {
          background: color-mix(in srgb, hsl(var(--warn)) 5%, hsl(var(--paper)));
        }
        .reading.warn .num {
          color: hsl(var(--warn));
        }
        .reading.warn .verdict {
          color: hsl(var(--warn));
        }
        .reading.warn .bar i {
          background: hsl(var(--warn));
        }
        .reading.crit {
          background: color-mix(in srgb, hsl(var(--danger)) 5%, hsl(var(--paper)));
        }
        .reading.crit .num {
          color: hsl(var(--danger));
        }
        .reading.crit .verdict {
          color: hsl(var(--danger));
        }
        .reading.crit .bar i {
          background: hsl(var(--danger));
        }
      `}</style>
    </div>
  );
}
