"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, CheckCircle, RotateCcw, Info, Search, Filter, ChevronDown, MapPin, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { AlertType } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/date-format";
import { useTranslations } from 'next-intl';

interface Alert {
  id: string;
  type: AlertType;
  reason: string;
  timestamp: Date;
  deviceName: string;
  sensorValues: {
    temperature: number;
    voltage: number;
    current: number;
    gasLevel: number;
    batteryPercent: number;
  };
  location?: string;
  resolvedAt?: Date;
}

// Mock alerts data
const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "cutoff",
    reason: "Temperature exceeded 65°C threshold",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    deviceName: "Tesla Model 3 - AB123",
    sensorValues: {
      temperature: 67.2,
      voltage: 52.1,
      current: 14.5,
      gasLevel: 45,
      batteryPercent: 78,
    },
    location: "Downtown Charging Station",
  },
  {
    id: "2",
    type: "warning",
    reason: "Voltage approaching upper limit",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    deviceName: "Tesla Model 3 - AB123",
    sensorValues: {
      temperature: 52.1,
      voltage: 53.8,
      current: 12.2,
      gasLevel: 38,
      batteryPercent: 85,
    },
  },
  {
    id: "3",
    type: "resolved",
    reason: "Temperature returned to normal range",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    deviceName: "Tesla Model 3 - AB123",
    sensorValues: {
      temperature: 48.5,
      voltage: 51.2,
      current: 8.5,
      gasLevel: 32,
      batteryPercent: 92,
    },
    resolvedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "4",
    type: "warning",
    reason: "Gas level elevated",
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    deviceName: "Tesla Model 3 - AB123",
    sensorValues: {
      temperature: 45.2,
      voltage: 50.8,
      current: 5.2,
      gasLevel: 68,
      batteryPercent: 95,
    },
    resolvedAt: new Date(Date.now() - 1000 * 60 * 90),
  },
];

const alertTypeConfig = {
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    color: 'hsl(var(--warn))',
    bgColor: 'color-mix(in srgb, hsl(var(--warn)) 8%, hsl(var(--paper)))',
    borderColor: 'color-mix(in srgb, hsl(var(--warn)) 25%, hsl(var(--rule)))',
  },
  cutoff: {
    icon: ShieldAlert,
    label: 'Cutoff',
    color: 'hsl(var(--danger))',
    bgColor: 'color-mix(in srgb, hsl(var(--danger)) 8%, hsl(var(--paper)))',
    borderColor: 'color-mix(in srgb, hsl(var(--danger)) 25%, hsl(var(--rule)))',
  },
  resolved: {
    icon: CheckCircle,
    label: 'Resolved',
    color: 'hsl(var(--ok))',
    bgColor: 'color-mix(in srgb, hsl(var(--ok)) 8%, hsl(var(--paper)))',
    borderColor: 'color-mix(in srgb, hsl(var(--ok)) 25%, hsl(var(--rule)))',
  },
  reset: {
    icon: RotateCcw,
    label: 'Reset',
    color: 'hsl(var(--accent))',
    bgColor: 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))',
    borderColor: 'color-mix(in srgb, hsl(var(--accent)) 25%, hsl(var(--rule)))',
  },
  info: {
    icon: Info,
    label: 'Info',
    color: 'hsl(var(--ink-3))',
    bgColor: 'hsl(var(--paper))',
    borderColor: 'hsl(var(--rule))',
  },
};

export default function AlertsPage() {
  const t = useTranslations('alerts');
  const tDash = useTranslations('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<AlertType[]>([]);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);
  const [referenceTime] = useState(() => new Date());

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredAlerts = mockAlerts.filter((alert) => {
    const matchesSearch = alert.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(alert.type);
    return matchesSearch && matchesType;
  });

  const toggleAlertExpansion = (id: string) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleTypeFilter = (type: AlertType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const formatTimestamp = (date: Date) => {
    return formatRelativeTime(date, referenceTime);
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">03 — Alert history</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                {filteredAlerts.length} EVENTS · LAST 7 DAYS
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Every alert, <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>timestamped.</em>
              </h2>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <section>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--ink-4))' }} />
              <Input
                placeholder="Search alerts by reason or device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 font-mono text-[13px]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["warning", "cutoff", "resolved"] as AlertType[]).map((type) => {
                const config = alertTypeConfig[type];
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={cn(
                      "px-4 py-2 rounded-lg border font-mono text-[11px] tracking-wide uppercase transition-all",
                      isSelected
                        ? "border-accent"
                        : "border-rule hover:border-ink-4"
                    )}
                    style={{
                      background: isSelected ? 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))' : 'hsl(var(--paper))',
                      color: isSelected ? 'hsl(var(--accent))' : 'hsl(var(--ink-3))',
                    }}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Alerts List */}
        <section className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredAlerts.map((alert) => {
              const config = alertTypeConfig[alert.type];
              const Icon = config.icon;
              const isExpanded = expandedAlerts.has(alert.id);

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="paper-surface-hover rounded-lg border cursor-pointer transition-all"
                    onClick={() => toggleAlertExpansion(alert.id)}
                    style={{
                      background: config.bgColor,
                      borderColor: config.borderColor,
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-5">
                        <div className="p-3 rounded-lg border shrink-0" style={{
                          borderColor: config.borderColor,
                          background: 'hsl(var(--bg))'
                        }}>
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap mb-2">
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wide" style={{
                                  background: config.bgColor,
                                  color: config.color,
                                  border: `1px solid ${config.borderColor}`,
                                }}>
                                  {config.label}
                                </span>
                                <span className="font-mono text-[11px]" style={{ color: 'hsl(var(--ink-3))' }}>
                                  {alert.deviceName}
                                </span>
                              </div>
                              <p className="text-[15px] font-medium leading-snug">{alert.reason}</p>
                            </div>

                            <ChevronDown
                              className={cn(
                                "w-5 h-5 shrink-0 transition-transform",
                                isExpanded && "rotate-180"
                              )}
                              style={{ color: 'hsl(var(--ink-4))' }}
                            />
                          </div>

                          <div className="flex items-center gap-5 font-mono text-[11px]" style={{ color: 'hsl(var(--ink-3))' }}>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(alert.timestamp)}
                            </div>
                            {alert.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" />
                                {alert.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-6 pt-6 border-t" style={{ borderColor: config.borderColor }}>
                              <h4 className="smallcaps mb-4" style={{ color: 'hsl(var(--ink-2))' }}>
                                Sensor values at event
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                <div className="p-4 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                                  <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Temperature</p>
                                  <p className="font-mono text-[18px] font-light tabular-nums">
                                    {alert.sensorValues.temperature.toFixed(1)}°C
                                  </p>
                                </div>
                                <div className="p-4 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                                  <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Voltage</p>
                                  <p className="font-mono text-[18px] font-light tabular-nums">
                                    {alert.sensorValues.voltage.toFixed(2)}V
                                  </p>
                                </div>
                                <div className="p-4 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                                  <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Current</p>
                                  <p className="font-mono text-[18px] font-light tabular-nums">
                                    {alert.sensorValues.current.toFixed(2)}A
                                  </p>
                                </div>
                                <div className="p-4 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                                  <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Gas Level</p>
                                  <p className="font-mono text-[18px] font-light tabular-nums">
                                    {alert.sensorValues.gasLevel.toFixed(0)} ppm
                                  </p>
                                </div>
                                <div className="p-4 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                                  <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Battery</p>
                                  <p className="font-mono text-[18px] font-light tabular-nums">
                                    {alert.sensorValues.batteryPercent.toFixed(0)}%
                                  </p>
                                </div>
                              </div>

                              {alert.resolvedAt && (
                                <div className="mt-4 p-4 rounded-lg border" style={{
                                  background: 'color-mix(in srgb, hsl(var(--ok)) 5%, hsl(var(--bg)))',
                                  borderColor: 'color-mix(in srgb, hsl(var(--ok)) 25%, hsl(var(--rule)))',
                                }}>
                                  <p className="text-[13px] font-medium" style={{ color: 'hsl(var(--ok))' }}>
                                    ✓ Resolved {formatTimestamp(alert.resolvedAt)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredAlerts.length === 0 && (
            <div className="paper-surface-hover rounded-lg border border-rule p-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-5 rounded-full border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                  <CheckCircle className="w-8 h-8" style={{ color: 'hsl(var(--ink-4))' }} />
                </div>
                <div>
                  <p className="text-[16px] font-medium mb-1">No alerts found</p>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    {searchQuery || selectedTypes.length > 0
                      ? 'Try adjusting your search or filters'
                      : 'All systems operating normally'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Alert History</span>
              <span className="opacity-40">·</span>
              <span>All events signed with HMAC-SHA256</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
