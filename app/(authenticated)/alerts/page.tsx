"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
    variant: "warning" as const,
  },
  cutoff: {
    icon: ShieldAlert,
    color: "text-danger",
    bgColor: "bg-danger/10",
    borderColor: "border-danger/20",
    variant: "destructive" as const,
  },
  resolved: {
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    variant: "success" as const,
  },
  reset: {
    icon: RotateCcw,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    variant: "default" as const,
  },
  info: {
    icon: Info,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted",
    variant: "secondary" as const,
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
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-heading-1">{t('title')}</h1>
          <p className="text-body text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>

        {/* Search and Filter */}
        <Card level={1} className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["warning", "cutoff", "resolved"] as AlertType[]).map((type) => {
                const config = alertTypeConfig[type];
                const isSelected = selectedTypes.includes(type);
                return (
                  <Button
                    key={type}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTypeFilter(type)}
                    className="capitalize"
                  >
                    <Filter className="w-3 h-3" />
                    {t(type)}
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Alerts List */}
        <div className="space-y-3">
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
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    level={2}
                    className={cn(
                      "overflow-hidden transition-all hover:shadow-clay-lg cursor-pointer",
                      config.bgColor
                    )}
                    onClick={() => toggleAlertExpansion(alert.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-2.5 rounded-lg shrink-0", config.bgColor)}>
                          <Icon className={cn("w-5 h-5", config.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant={config.variant} className="capitalize">
                                  {alert.type}
                                </Badge>
                                <span className="text-caption text-muted-foreground">
                                  {alert.deviceName}
                                </span>
                              </div>
                              <p className="text-body font-medium">{alert.reason}</p>
                            </div>

                            <ChevronDown
                              className={cn(
                                "w-5 h-5 text-muted-foreground shrink-0 transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>

                          <div className="flex items-center gap-4 text-caption text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(alert.timestamp)}
                            </div>
                            {alert.location && (
                              <div className="flex items-center gap-1">
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
                            <div className="mt-4 pt-4 border-t border-border">
                              <h4 className="text-body-sm font-semibold mb-3">
                                {t('sensorValues')}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="clay-inset p-3 rounded-md">
                                  <p className="text-caption text-muted-foreground mb-1">{tDash('temperature')}</p>
                                  <p className="text-body font-semibold tabular-nums">
                                    {alert.sensorValues.temperature.toFixed(1)}°C
                                  </p>
                                </div>
                                <div className="clay-inset p-3 rounded-md">
                                  <p className="text-caption text-muted-foreground mb-1">{tDash('voltage')}</p>
                                  <p className="text-body font-semibold tabular-nums">
                                    {alert.sensorValues.voltage.toFixed(2)}V
                                  </p>
                                </div>
                                <div className="clay-inset p-3 rounded-md">
                                  <p className="text-caption text-muted-foreground mb-1">{tDash('current')}</p>
                                  <p className="text-body font-semibold tabular-nums">
                                    {alert.sensorValues.current.toFixed(2)}A
                                  </p>
                                </div>
                                <div className="clay-inset p-3 rounded-md">
                                  <p className="text-caption text-muted-foreground mb-1">{tDash('gasLevel')}</p>
                                  <p className="text-body font-semibold tabular-nums">
                                    {alert.sensorValues.gasLevel.toFixed(0)} ppm
                                  </p>
                                </div>
                                <div className="clay-inset p-3 rounded-md">
                                  <p className="text-caption text-muted-foreground mb-1">{tDash('battery')}</p>
                                  <p className="text-body font-semibold tabular-nums">
                                    {alert.sensorValues.batteryPercent.toFixed(0)}%
                                  </p>
                                </div>
                              </div>

                              {alert.resolvedAt && (
                                <div className="mt-3 p-3 rounded-md bg-success/10 border border-success/20">
                                  <p className="text-body-sm text-success">
                                    ✓ {t('resolved')} {formatTimestamp(alert.resolvedAt)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredAlerts.length === 0 && (
            <Card level={1} className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-muted">
                  <CheckCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-body font-medium">{t('noAlertsFound')}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {searchQuery || selectedTypes.length > 0
                      ? t('tryAdjusting')
                      : t('allNormal')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
