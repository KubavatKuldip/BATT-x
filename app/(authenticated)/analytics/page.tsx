"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Shield, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/utils/date-format";
import { useTranslations } from 'next-intl';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Deterministic mock data for fallback (SSR-safe)
const generateMockChartData = () => {
  const data = [];
  const referenceTime = new Date("2026-09-13T12:00:00Z").getTime();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(referenceTime - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: date.getTime(),
      battery: 85 + ((i % 5) / 5) * 10,
      temperature: 40 + ((i % 3) / 3) * 15,
      voltage: 50 + ((i % 4) / 4) * 3,
      current: ((i % 7) / 7) * 12,
      verified: i !== 2,
    });
  }
  return data;
};

const mockChartData = generateMockChartData();

// Mock charging sessions (deterministic)
const mockChargingSessions = [
  {
    id: "mock-1",
    startTime: new Date(new Date("2026-09-13T12:00:00Z").getTime() - 1000 * 60 * 60 * 3),
    endTime: new Date(new Date("2026-09-13T12:00:00Z").getTime() - 1000 * 60 * 30),
    startBattery: 45,
    endBattery: 95,
    avgTemp: 48.5,
    maxVoltage: 53.2,
    verified: true,
    device: { nickname: "Demo Vehicle", serialNumber: "DEMO001" },
  },
  {
    id: "mock-2",
    startTime: new Date(new Date("2026-09-13T12:00:00Z").getTime() - 1000 * 60 * 60 * 24),
    endTime: new Date(new Date("2026-09-13T12:00:00Z").getTime() - 1000 * 60 * 60 * 22),
    startBattery: 35,
    endBattery: 90,
    avgTemp: 46.8,
    maxVoltage: 52.8,
    verified: true,
    device: { nickname: "Demo Vehicle", serialNumber: "DEMO001" },
  },
  {
    id: "mock-3",
    startTime: new Date(new Date("2026-09-13T12:00:00Z").getTime() - 1000 * 60 * 60 * 48),
    endTime: new Date(new Date("2026-09-13T12:00:00Z").getTime() - 1000 * 60 * 60 * 46),
    startBattery: 42,
    endBattery: 88,
    avgTemp: 51.2,
    maxVoltage: 53.5,
    verified: false,
    device: { nickname: "Demo Vehicle", serialNumber: "DEMO001" },
  },
];

type DateRange = "7d" | "30d" | "custom";

interface ChartDataPoint {
  date: string;
  timestamp: number;
  battery: number | null;
  temperature: number | null;
  voltage: number | null;
  current: number | null;
  verified: boolean;
}

interface ChargeSession {
  id: string;
  startTime: Date | string;
  endTime: Date | string | null;
  startBattery: number;
  endBattery: number | null;
  avgTemp: number | null;
  maxVoltage: number | null;
  verified: boolean;
  device: {
    nickname: string | null;
    serialNumber: string;
  };
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(mockChartData);
  const [chargingSessions, setChargingSessions] = useState<ChargeSession[]>(mockChargingSessions);
  const [useRealData, setUseRealData] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch real analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 7;
        const response = await fetch(`/api/analytics?days=${days}`);

        if (response.ok) {
          const data = await response.json();

          if (data.hasData) {
            // Use real data
            setChartData(data.chartData.length > 0 ? data.chartData : mockChartData);
            setChargingSessions(
              data.chargeSessions.length > 0
                ? data.chargeSessions.map((s: any) => ({
                    ...s,
                    startTime: new Date(s.startTime),
                    endTime: s.endTime ? new Date(s.endTime) : null,
                  }))
                : mockChargingSessions
            );
            setUseRealData(true);
          } else {
            // No data, use mock
            setChartData(mockChartData);
            setChargingSessions(mockChargingSessions);
            setUseRealData(false);
          }
        } else {
          // API error, use mock
          setChartData(mockChartData);
          setChargingSessions(mockChargingSessions);
          setUseRealData(false);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        // Fallback to mock data
        setChartData(mockChartData);
        setChargingSessions(mockChargingSessions);
        setUseRealData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  const handleExportPDF = () => {
    // Placeholder for PDF export
    console.log("Exporting PDF report...");
  };

  const handleExportCSV = () => {
    // Placeholder for CSV export
    console.log("Exporting CSV data...");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-heading-1">{t('title')}</h1>
            <p className="text-body text-muted-foreground mt-1">
              {t('description')}
              {!useRealData && !isLoading && (
                <span className="ml-2 text-xs text-warning">(Demo data - no real analytics available)</span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card level={1} className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-body-sm font-medium">Date Range:</span>
            <div className="flex gap-2">
              {(["7d", "30d", "custom"] as DateRange[]).map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(range)}
                  disabled={range === "custom" || isLoading}
                >
                  {range === "7d"
                    ? "Last 7 Days"
                    : range === "30d"
                    ? "Last 30 Days"
                    : "Custom Range"}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Battery Percentage Chart */}
            <Card level={2} className="p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle>Battery Level Over Time</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      domain={[0, 100]}
                      label={{ value: "Battery %", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="battery"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      fill="url(#batteryGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Temperature & Voltage Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card level={2} className="p-6">
                <CardHeader className="p-0 mb-6">
                  <CardTitle>Temperature Trends</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        label={{ value: "°C", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="hsl(var(--warning))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card level={2} className="p-6">
                <CardHeader className="p-0 mb-6">
                  <CardTitle>Voltage Trends</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        label={{ value: "V", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="voltage"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charging Sessions */}
            <Card level={2} className="p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle>Recent Charging Sessions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chargingSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No charging sessions in the selected date range
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chargingSessions.map((session) => {
                      const startTime = typeof session.startTime === 'string'
                        ? new Date(session.startTime)
                        : session.startTime;
                      const endTime = session.endTime
                        ? (typeof session.endTime === 'string' ? new Date(session.endTime) : session.endTime)
                        : null;

                      return (
                        <Card key={session.id} level={1} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-body font-medium">
                                  {isClient
                                    ? `${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : formatDateTime(startTime)}
                                </span>
                                {session.device?.nickname && (
                                  <span className="text-caption text-muted-foreground">
                                    · {session.device.nickname}
                                  </span>
                                )}
                                {session.verified ? (
                                  <Badge variant="success" className="text-xs">
                                    <Shield className="w-3 h-3" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <ShieldAlert className="w-3 h-3" />
                                    Tampered
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-sm">
                                <div>
                                  <p className="text-muted-foreground">Duration</p>
                                  <p className="font-semibold tabular-nums">
                                    {endTime
                                      ? `${Math.round((endTime.getTime() - startTime.getTime()) / 60000)} min`
                                      : "In progress"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Battery Gain</p>
                                  <p className="font-semibold tabular-nums">
                                    {session.startBattery.toFixed(0)}% →{" "}
                                    {session.endBattery ? `${session.endBattery.toFixed(0)}%` : "..."}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Avg Temp</p>
                                  <p className="font-semibold tabular-nums">
                                    {session.avgTemp ? `${session.avgTemp.toFixed(1)}°C` : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Max Voltage</p>
                                  <p className="font-semibold tabular-nums">
                                    {session.maxVoltage ? `${session.maxVoltage.toFixed(1)}V` : "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
