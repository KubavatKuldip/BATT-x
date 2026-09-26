"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Battery, AlertTriangle, TrendingUp, Activity, Cpu, Shield } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-heading-3 mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: analytics.summary.totalUsers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Devices",
      value: analytics.summary.totalDevices,
      icon: Battery,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Online Devices",
      value: analytics.summary.onlineDevices,
      icon: Activity,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Active Alerts",
      value: analytics.summary.activeAlerts,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Alerts (30d)",
      value: analytics.summary.alertsLast30Days,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Charge Sessions",
      value: analytics.summary.totalChargeSessions,
      icon: Cpu,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('description')}
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield className="w-3 h-3" /> Admin
          </Badge>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card level={2}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  <p className="text-caption text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* DISTRIBUTION CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Status */}
          <Card level={2}>
            <CardHeader>
              <CardTitle>Device Status Distribution</CardTitle>
              <CardDescription>Current status of all devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.deviceStatusDistribution.map((d) => {
                const percent = (d.count / analytics.summary.totalDevices) * 100;
                return (
                  <div key={d.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{d.status}</span>
                      <span className="text-muted-foreground">
                        {d.count} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          d.status === "ONLINE" ? "bg-success" :
                          d.status === "OFFLINE" ? "bg-muted-foreground" :
                          d.status === "WARNING" ? "bg-warning" :
                          "bg-destructive"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Vehicle Type Distribution */}
          <Card level={2}>
            <CardHeader>
              <CardTitle>Vehicle Type Distribution</CardTitle>
              <CardDescription>Devices by vehicle category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.vehicleTypeDistribution.map((v) => {
                const percent = (v.count / analytics.summary.totalDevices) * 100;
                return (
                  <div key={v.vehicleType}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {v.vehicleType === "TWO_WHEELER" ? "2-Wheeler" :
                         v.vehicleType === "THREE_WHEELER" ? "3-Wheeler" : "4-Wheeler"}
                      </span>
                      <span className="text-muted-foreground">
                        {v.count} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ALERT TYPE DISTRIBUTION */}
        <Card level={2}>
          <CardHeader>
            <CardTitle>Alert Type Distribution (Last 30 Days)</CardTitle>
            <CardDescription>Breakdown of alert types received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analytics.alertTypeDistribution.map((a) => {
                const max = Math.max(...analytics.alertTypeDistribution.map((x) => x.count));
                const percent = max > 0 ? (a.count / max) * 100 : 0;
                return (
                  <div key={a.type} className="text-center">
                    <div className="relative h-24 flex items-end justify-center mb-2">
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          a.type === "CUTOFF" ? "bg-destructive" :
                          a.type === "WARNING" ? "bg-warning" :
                          a.type === "RESOLVED" ? "bg-success" :
                          a.type === "RESET" ? "bg-info" : "bg-muted-foreground"
                        }`}
                        style={{ height: `${percent}%`, minHeight: a.count > 0 ? "8px" : "0" }}
                      />
                    </div>
                    <p className="text-lg font-bold">{a.count}</p>
                    <p className="text-caption text-muted-foreground">{a.type}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* TOP USERS & RECENT ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <Card level={2}>
            <CardHeader>
              <CardTitle>Top Users by Device Count</CardTitle>
              <CardDescription>Users with the most paired devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topUsers.slice(0, 5).map((user, idx) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-caption font-bold">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name || "N/A"}</p>
                        <p className="text-caption text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{user.deviceCount} devices</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card level={2}>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest safety events across the fleet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentAlerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No recent alerts</p>
                ) : (
                  analytics.recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        alert.type === "CUTOFF" ? "bg-destructive" :
                        alert.type === "WARNING" ? "bg-warning" :
                        "bg-info"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{alert.device.nickname || alert.device.serialNumber}</p>
                          <Badge variant={alert.resolvedAt ? "outline" : "destructive"} className="text-caption">
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-caption text-muted-foreground line-clamp-1">{alert.reason}</p>
                        <p className="text-caption text-muted-foreground">
                          {isClient ? new Date(alert.createdAt).toLocaleString() : formatDateTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QUICK ACTIONS */}
        <Card level={2}>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Quick access to management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Users className="w-5 h-5" />
                <span>Manage Users</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Cpu className="w-5 h-5" />
                <span>Schedule Firmware</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Activity className="w-5 h-5" />
                <span>View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}