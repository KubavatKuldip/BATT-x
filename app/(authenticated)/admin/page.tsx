"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Battery, AlertTriangle, TrendingUp, Activity, Cpu, Shield, ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateTime } from "@/lib/utils/date-format";
import { useTranslations } from 'next-intl';

type AnalyticsData = {
  summary: {
    totalUsers: number;
    totalDevices: number;
    onlineDevices: number;
    activeAlerts: number;
    alertsLast30Days: number;
    totalChargeSessions: number;
  };
  deviceStatusDistribution: Array<{ status: string; count: number }>;
  vehicleTypeDistribution: Array<{ vehicleType: string; count: number }>;
  alertTypeDistribution: Array<{ type: string; count: number }>;
  topUsers: Array<{ id: string; name: string; email: string; deviceCount: number }>;
  recentAlerts: Array<any>;
  dailyAlertTrend: Array<{ date: string; count: number }>;
};

export default function AdminPage() {
  const t = useTranslations('admin');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg))' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(var(--accent))' }} />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg))' }}>
        <div className="text-center">
          <div className="p-5 rounded-full border border-rule mx-auto mb-6 w-fit" style={{ background: 'hsl(var(--bg))' }}>
            <Shield className="w-10 h-10" style={{ color: 'hsl(var(--ink-4))' }} />
          </div>
          <h2 className="text-[24px] font-medium tracking-tight mb-2">Access Denied</h2>
          <p className="text-[14px]" style={{ color: 'hsl(var(--ink-3))' }}>
            You don't have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: analytics.summary.totalUsers,
      icon: Users,
      color: 'hsl(var(--accent))',
    },
    {
      title: "Total Devices",
      value: analytics.summary.totalDevices,
      icon: Battery,
      color: 'hsl(var(--ok))',
    },
    {
      title: "Online Devices",
      value: analytics.summary.onlineDevices,
      icon: Activity,
      color: 'hsl(var(--accent))',
    },
    {
      title: "Active Alerts",
      value: analytics.summary.activeAlerts,
      icon: AlertTriangle,
      color: 'hsl(var(--danger))',
    },
    {
      title: "Alerts (30d)",
      value: analytics.summary.alertsLast30Days,
      icon: TrendingUp,
      color: 'hsl(var(--warn))',
    },
    {
      title: "Charge Sessions",
      value: analytics.summary.totalChargeSessions,
      icon: Cpu,
      color: 'hsl(var(--ink-2))',
    },
  ];

  const statusColorMap: Record<string, string> = {
    ONLINE: 'hsl(var(--ok))',
    OFFLINE: 'hsl(var(--ink-4))',
    WARNING: 'hsl(var(--warn))',
    CUTOFF: 'hsl(var(--danger))',
  };

  const alertColorMap: Record<string, string> = {
    CUTOFF: 'hsl(var(--danger))',
    WARNING: 'hsl(var(--warn))',
    RESOLVED: 'hsl(var(--ok))',
    RESET: 'hsl(var(--accent))',
    INFO: 'hsl(var(--ink-3))',
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">07 — Administration</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded uppercase tracking-wide" style={{
                  background: 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))',
                  color: 'hsl(var(--accent))',
                  border: '1px solid color-mix(in srgb, hsl(var(--accent)) 25%, hsl(var(--rule)))',
                }}>
                  <Shield className="w-3 h-3" aria-hidden="true" />
                  Admin
                </span>
              </div>
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                {analytics.summary.totalDevices} DEVICES · {analytics.summary.totalUsers} USERS
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Fleet <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>overview.</em>
              </h2>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <section>
          <div className="mb-6">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Platform Summary</h3>
            <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
              Key metrics across the entire fleet
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {statCards.map((stat, idx) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="paper-surface-hover rounded-lg border border-rule p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} aria-hidden="true" />
                    <span className="smallcaps" style={{ color: 'hsl(var(--ink-3))' }}>{stat.title}</span>
                  </div>
                  <p className="font-mono text-[28px] font-light tabular-nums">{stat.value.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Status */}
          <section>
            <div className="mb-6">
              <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Device Status</h3>
              <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                Current status of all devices
              </p>
            </div>

            <div className="paper-surface-hover rounded-lg border border-rule p-6 space-y-4">
              {analytics.deviceStatusDistribution.map((d) => {
                const percent = analytics.summary.totalDevices > 0
                  ? (d.count / analytics.summary.totalDevices) * 100
                  : 0;
                const barColor = statusColorMap[d.status] || 'hsl(var(--ink-4))';
                return (
                  <div key={d.status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[12px] tracking-wide uppercase">{d.status}</span>
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: 'hsl(var(--ink-3))' }}>
                        {d.count} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--bg))' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Vehicle Type Distribution */}
          <section>
            <div className="mb-6">
              <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Vehicle Types</h3>
              <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                Devices by vehicle category
              </p>
            </div>

            <div className="paper-surface-hover rounded-lg border border-rule p-6 space-y-4">
              {analytics.vehicleTypeDistribution.map((v) => {
                const percent = analytics.summary.totalDevices > 0
                  ? (v.count / analytics.summary.totalDevices) * 100
                  : 0;
                return (
                  <div key={v.vehicleType}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[12px] tracking-wide uppercase">
                        {v.vehicleType === "TWO_WHEELER" ? "2-Wheeler" :
                         v.vehicleType === "THREE_WHEELER" ? "3-Wheeler" : "4-Wheeler"}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: 'hsl(var(--ink-3))' }}>
                        {v.count} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--bg))' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, background: 'hsl(var(--accent))' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Alert Type Distribution */}
        <section>
          <div className="mb-6">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Alert Distribution</h3>
            <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
              Breakdown of alert types over the last 30 days
            </p>
          </div>

          <div className="paper-surface-hover rounded-lg border border-rule p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              {analytics.alertTypeDistribution.map((a) => {
                const max = Math.max(...analytics.alertTypeDistribution.map((x) => x.count));
                const percent = max > 0 ? (a.count / max) * 100 : 0;
                const barColor = alertColorMap[a.type] || 'hsl(var(--ink-4))';
                return (
                  <div key={a.type} className="text-center">
                    <div className="relative h-24 flex items-end justify-center mb-3">
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${percent}%`,
                          minHeight: a.count > 0 ? "8px" : "0",
                          background: barColor,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <p className="font-mono text-[20px] font-light tabular-nums mb-1">{a.count}</p>
                    <p className="font-mono text-[10px] tracking-wide uppercase" style={{ color: 'hsl(var(--ink-3))' }}>{a.type}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Top Users & Recent Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <section>
            <div className="mb-6">
              <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Top Users</h3>
              <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                Users with the most paired devices
              </p>
            </div>

            <div className="space-y-3">
              {analytics.topUsers.slice(0, 5).map((user, idx) => (
                <div
                  key={user.id}
                  className="paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-[11px] font-medium"
                      style={{
                        background: 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))',
                        color: 'hsl(var(--accent))',
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium">{user.name || "N/A"}</p>
                      <p className="font-mono text-[11px]" style={{ color: 'hsl(var(--ink-3))' }}>{user.email}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] px-2.5 py-1 rounded" style={{
                    background: 'hsl(var(--bg))',
                    color: 'hsl(var(--ink-2))',
                    border: '1px solid hsl(var(--rule))',
                  }}>
                    {user.deviceCount} devices
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Alerts */}
          <section>
            <div className="mb-6">
              <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Recent Alerts</h3>
              <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                Latest safety events across the fleet
              </p>
            </div>

            <div className="space-y-3">
              {analytics.recentAlerts.length === 0 ? (
                <div className="paper-surface-hover rounded-lg border border-rule p-16 text-center">
                  <p className="font-mono text-[12px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    No recent alerts
                  </p>
                </div>
              ) : (
                analytics.recentAlerts.map((alert) => {
                  const dotColor = alert.type === "CUTOFF" ? 'hsl(var(--danger))'
                    : alert.type === "WARNING" ? 'hsl(var(--warn))'
                    : 'hsl(var(--accent))';
                  const typeBg = alert.type === "CUTOFF"
                    ? 'color-mix(in srgb, hsl(var(--danger)) 8%, hsl(var(--paper)))'
                    : alert.type === "WARNING"
                    ? 'color-mix(in srgb, hsl(var(--warn)) 8%, hsl(var(--paper)))'
                    : 'hsl(var(--bg))';
                  const typeColor = alert.type === "CUTOFF"
                    ? 'hsl(var(--danger))'
                    : alert.type === "WARNING"
                    ? 'hsl(var(--warn))'
                    : 'hsl(var(--ink-3))';
                  const typeBorder = alert.type === "CUTOFF"
                    ? '1px solid color-mix(in srgb, hsl(var(--danger)) 25%, hsl(var(--rule)))'
                    : alert.type === "WARNING"
                    ? '1px solid color-mix(in srgb, hsl(var(--warn)) 25%, hsl(var(--rule)))'
                    : '1px solid hsl(var(--rule))';

                  return (
                    <div key={alert.id} className="paper-surface-hover rounded-lg border border-rule p-5">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 shrink-0"
                          style={{ background: dotColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-[14px] font-medium truncate">
                              {alert.device.nickname || alert.device.serialNumber}
                            </p>
                            <span
                              className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wide shrink-0"
                              style={{
                                background: typeBg,
                                color: typeColor,
                                border: typeBorder,
                              }}
                            >
                              {alert.type}
                            </span>
                          </div>
                          <p className="text-[13px] mb-1.5 line-clamp-1" style={{ color: 'hsl(var(--ink-2))' }}>
                            {alert.reason}
                          </p>
                          <p className="font-mono text-[10px]" style={{ color: 'hsl(var(--ink-4))' }}>
                            {isClient ? new Date(alert.createdAt).toLocaleString() : formatDateTime(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Admin Actions */}
        <section>
          <div className="mb-6">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Admin Actions</h3>
            <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
              Quick access to management tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <button
              className="paper-surface-hover rounded-lg border border-rule p-6 flex flex-col items-center justify-center gap-3 h-24 transition-all hover:border-ink-4"
            >
              <Users className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} aria-hidden="true" />
              <span className="font-mono text-[12px] tracking-wide">Manage Users</span>
            </button>
            <button
              className="paper-surface-hover rounded-lg border border-rule p-6 flex flex-col items-center justify-center gap-3 h-24 transition-all hover:border-ink-4"
            >
              <Cpu className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} aria-hidden="true" />
              <span className="font-mono text-[12px] tracking-wide">Schedule Firmware</span>
            </button>
            <button
              className="paper-surface-hover rounded-lg border border-rule p-6 flex flex-col items-center justify-center gap-3 h-24 transition-all hover:border-ink-4"
            >
              <Activity className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} aria-hidden="true" />
              <span className="font-mono text-[12px] tracking-wide">View Reports</span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Admin Panel</span>
              <span className="opacity-40">·</span>
              <span>Fleet management · Role-gated access</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
