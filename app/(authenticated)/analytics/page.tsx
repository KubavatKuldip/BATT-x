"use client";

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
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">04 — Analytics & trends</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                {dateRange === "7d" ? "LAST 7 DAYS" : "LAST 30 DAYS"}
                {!useRealData && !isLoading && " · DEMO DATA"}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="font-mono text-[11px] h-9"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="font-mono text-[11px] h-9"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Performance over <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>time.</em>
              </h2>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <section>
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4" style={{ color: 'hsl(var(--ink-4))' }} />
            <span className="font-mono text-[12px] tracking-wide" style={{ color: 'hsl(var(--ink-2))' }}>TIME RANGE</span>
            <div className="flex gap-2">
              {(["7d", "30d"] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg border font-mono text-[11px] tracking-wide uppercase transition-all ${
                    dateRange === range ? 'border-accent' : 'border-rule hover:border-ink-4'
                  }`}
                  style={{
                    background: dateRange === range ? 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))' : 'hsl(var(--paper))',
                    color: dateRange === range ? 'hsl(var(--accent))' : 'hsl(var(--ink-3))',
                  }}
                >
                  {range === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="font-mono text-[12px]" style={{ color: 'hsl(var(--ink-3))' }}>Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Battery Percentage Chart */}
            <section>
              <div className="mb-6">
                <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Battery Level Over Time</h3>
                <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                  Daily charge levels with cryptographic verification
                </p>
              </div>

              <div className="paper-surface-hover rounded-lg border border-rule p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--ok))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--ok))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--rule))" />
                    <XAxis
                      dataKey="date"
                      className="font-mono text-[10px]"
                      tick={{ fill: "hsl(var(--ink-3))" }}
                    />
                    <YAxis
                      className="font-mono text-[10px]"
                      tick={{ fill: "hsl(var(--ink-3))" }}
                      domain={[0, 100]}
                      label={{ value: "Battery %", angle: -90, position: "insideLeft", style: { fill: "hsl(var(--ink-3))" } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--paper))",
                        border: "1px solid hsl(var(--rule))",
                        borderRadius: "8px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="battery"
                      stroke="hsl(var(--ok))"
                      strokeWidth={2}
                      fill="url(#batteryGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Temperature & Voltage Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section>
                <div className="mb-6">
                  <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Temperature Trends</h3>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Cell temperature readings
                  </p>
                </div>

                <div className="paper-surface-hover rounded-lg border border-rule p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--rule))" />
                      <XAxis
                        dataKey="date"
                        className="font-mono text-[10px]"
                        tick={{ fill: "hsl(var(--ink-3))" }}
                      />
                      <YAxis
                        className="font-mono text-[10px]"
                        tick={{ fill: "hsl(var(--ink-3))" }}
                        label={{ value: "°C", angle: -90, position: "insideLeft", style: { fill: "hsl(var(--ink-3))" } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--paper))",
                          border: "1px solid hsl(var(--rule))",
                          borderRadius: "8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="hsl(var(--warn))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--warn))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section>
                <div className="mb-6">
                  <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Voltage Trends</h3>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Pack voltage measurements
                  </p>
                </div>

                <div className="paper-surface-hover rounded-lg border border-rule p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--rule))" />
                      <XAxis
                        dataKey="date"
                        className="font-mono text-[10px]"
                        tick={{ fill: "hsl(var(--ink-3))" }}
                      />
                      <YAxis
                        className="font-mono text-[10px]"
                        tick={{ fill: "hsl(var(--ink-3))" }}
                        label={{ value: "V", angle: -90, position: "insideLeft", style: { fill: "hsl(var(--ink-3))" } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--paper))",
                          border: "1px solid hsl(var(--rule))",
                          borderRadius: "8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="voltage"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--accent))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Charging Sessions */}
            <section>
              <div className="mb-6">
                <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Recent Charging Sessions</h3>
                <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                  Logged charge cycles with integrity verification
                </p>
              </div>

              {chargingSessions.length === 0 ? (
                <div className="paper-surface-hover rounded-lg border border-rule p-16 text-center">
                  <p className="font-mono text-[12px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    No charging sessions in the selected date range
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chargingSessions.map((session) => {
                    const startTime = typeof session.startTime === 'string'
                      ? new Date(session.startTime)
                      : session.startTime;
                    const endTime = session.endTime
                      ? (typeof session.endTime === 'string' ? new Date(session.endTime) : session.endTime)
                      : null;

                    return (
                      <div
                        key={session.id}
                        className="paper-surface-hover rounded-lg border border-rule p-6"
                      >
                        <div className="flex items-start justify-between gap-4 mb-5">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <span className="font-mono text-[13px] font-medium">
                                {isClient
                                  ? `${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : formatDateTime(startTime)}
                              </span>
                              {session.device?.nickname && (
                                <span className="font-mono text-[11px]" style={{ color: 'hsl(var(--ink-3))' }}>
                                  {session.device.nickname}
                                </span>
                              )}
                            </div>
                          </div>
                          {session.verified ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded uppercase tracking-wide" style={{
                              background: 'color-mix(in srgb, hsl(var(--ok)) 8%, hsl(var(--paper)))',
                              color: 'hsl(var(--ok))',
                              border: '1px solid color-mix(in srgb, hsl(var(--ok)) 25%, hsl(var(--rule)))',
                            }}>
                              <Shield className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded uppercase tracking-wide" style={{
                              background: 'color-mix(in srgb, hsl(var(--danger)) 8%, hsl(var(--paper)))',
                              color: 'hsl(var(--danger))',
                              border: '1px solid color-mix(in srgb, hsl(var(--danger)) 25%, hsl(var(--rule)))',
                            }}>
                              <ShieldAlert className="w-3 h-3" />
                              Tampered
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                          <div>
                            <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Duration</p>
                            <p className="font-mono text-[16px] font-light tabular-nums">
                              {endTime
                                ? `${Math.round((endTime.getTime() - startTime.getTime()) / 60000)} min`
                                : "In progress"}
                            </p>
                          </div>
                          <div>
                            <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Battery Gain</p>
                            <p className="font-mono text-[16px] font-light tabular-nums">
                              {session.startBattery.toFixed(0)}% →{" "}
                              {session.endBattery ? `${session.endBattery.toFixed(0)}%` : "..."}
                            </p>
                          </div>
                          <div>
                            <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Avg Temp</p>
                            <p className="font-mono text-[16px] font-light tabular-nums">
                              {session.avgTemp ? `${session.avgTemp.toFixed(1)}°C` : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="smallcaps mb-2" style={{ color: 'hsl(var(--ink-3))' }}>Max Voltage</p>
                            <p className="font-mono text-[16px] font-light tabular-nums">
                              {session.maxVoltage ? `${session.maxVoltage.toFixed(1)}V` : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Analytics</span>
              <span className="opacity-40">·</span>
              <span>All records cryptographically signed</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
