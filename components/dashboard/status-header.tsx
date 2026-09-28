"use client";

import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import type { DeviceStatus, ConnectionStatus } from "@/lib/types";
import { useState, useEffect } from "react";

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
  const [countdown, setCountdown] = useState(gracePeriodSeconds || 90);

  useEffect(() => {
    if (gracePeriodSeconds !== null && gracePeriodSeconds > 0) {
      setCountdown(gracePeriodSeconds);
      const timer = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gracePeriodSeconds]);

  const getStatusConfig = () => {
    switch (deviceStatus) {
      case 'normal':
        return {
          icon: Shield,
          eyebrow: '01 — System state',
          headlineText: 'All systems ',
          headlineEmphasis: 'nominal.',
          lede: 'Unit 0042 is monitoring every cell. Temperature, gas, current, and voltage are all within their safe envelopes. No action is required.',
          mode: '',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          eyebrow: '01 — System state · elevated',
          headlineText: 'Temperature is ',
          headlineEmphasis: 'climbing.',
          lede: 'Cell temperature has crossed the warning threshold. This is common on sustained climbs and in high ambient heat. The unit is watching closely and will escalate if the trend continues.',
          mode: 'warn',
        };
      case 'cutoff':
        return {
          icon: AlertTriangle,
          eyebrow: '01 — System state · grace period',
          headlineText: 'Pull over ',
          headlineEmphasis: 'safely.',
          lede: 'Temperature and gas readings both indicate an early thermal event. The unit will isolate the pack when the countdown reaches zero. Signal, move to the shoulder, and switch off.',
          mode: 'grace',
        };
      case 'cutoff':
        return {
          icon: XCircle,
          eyebrow: '01 — System state · isolated',
          headlineText: 'Pack ',
          headlineEmphasis: 'isolated.',
          lede: 'The unit has disconnected the battery to prevent propagation. The vehicle will not start until the pack cools and the fault is cleared. Your records are sealed and complete.',
          mode: 'cut',
        };
      case 'normal':
      default:
        return {
          icon: Shield,
          eyebrow: '01 — System state',
          headlineText: 'All systems ',
          headlineEmphasis: 'nominal.',
          lede: 'Unit 0042 is monitoring every cell.',
          mode: '',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <section className="border-b pb-16 mb-16" style={{ borderColor: 'hsl(var(--rule))' }}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.82fr] gap-10 lg:gap-20 items-center">
        <div>
          <div className="eyebrow mb-7">{statusConfig.eyebrow}</div>
          <h1 className="h-display mb-7" style={{ color: 'hsl(var(--ink))' }}>
            {statusConfig.headlineText}
            <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>
              {statusConfig.headlineEmphasis}
            </em>
          </h1>
          <p className="lede mb-8">{statusConfig.lede}</p>

          <div className="flex gap-9 flex-wrap pt-7 border-t" style={{ borderColor: 'hsl(var(--rule))' }}>
            <div>
              <div className="font-mono text-xl font-normal tracking-tight tabular-nums" style={{ color: 'hsl(var(--ink))' }}>
                04:12:08
              </div>
              <div className="smallcaps mt-1.5">Uptime</div>
            </div>
            <div>
              <div className="font-mono text-xl font-normal tracking-tight tabular-nums" style={{ color: 'hsl(var(--ink))' }}>
                {lastSyncAt ? lastSyncAt.toTimeString().slice(0, 8) : '--:--:--'}
              </div>
              <div className="smallcaps mt-1.5">Last sync</div>
            </div>
          </div>
        </div>

        <div className={cn("flex items-center justify-center", statusConfig.mode)}>
          <div className={cn(
            "relative grid place-items-center rounded-full border transition-all duration-500",
            "w-[clamp(180px,24vw,280px)] h-[clamp(180px,24vw,280px)]"
          )} style={{
            background: statusConfig.mode === 'warn'
              ? 'radial-gradient(circle at 50% 35%, hsl(var(--warn-soft)), transparent 68%)'
              : statusConfig.mode === 'cut'
              ? 'radial-gradient(circle at 50% 35%, hsl(var(--danger-soft)), transparent 68%)'
              : 'radial-gradient(circle at 50% 35%, hsl(var(--accent-soft)), transparent 68%)',
            borderColor: 'hsl(var(--rule))',
          }}>
            <StatusIcon
              className="w-[38%] h-[38%] transition-colors duration-400"
              style={{
                stroke: statusConfig.mode === 'warn' ? 'hsl(var(--warn))' :
                       statusConfig.mode === 'cut' ? 'hsl(var(--danger))' :
                       'hsl(var(--accent))',
                fill: 'none',
                strokeWidth: 1.3,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
