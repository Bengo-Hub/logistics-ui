"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BarChart3, CheckCircle, Clock, Loader2, Package, TrendingUp, Users, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";
import { useTelemetry } from "@/hooks/use-telemetry";
import { useKPIs } from "@/hooks/use-analytics";
import type { KPIPeriod } from "@/lib/api/logistics";

// ─── Types ────────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

// ─── Chart Colours ────────────────────────────────────────────────────────────

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success, 142 71% 45%))",
  warning: "hsl(var(--warning, 38 92% 50%))",
  destructive: "hsl(var(--destructive, 0 84% 60%))",
  muted: "hsl(var(--muted-foreground))",
};

const STATUS_PIE_DATA = (completed: number, failed: number, pending: number) => [
  { name: "Completed", value: completed, color: COLORS.success },
  { name: "Failed", value: failed, color: COLORS.destructive },
  { name: "Pending", value: pending, color: COLORS.warning },
];

// Simulated daily breakdown from a single-period telemetry snapshot
// (real implementation would use a time-series endpoint)
function buildDailyData(period: Period, total: number, completed: number, failed: number) {
  const days = period === "today" ? 1 : period === "week" ? 7 : 30;
  const basePerDay = Math.max(1, Math.round(total / days));
  const completedPerDay = Math.max(0, Math.round(completed / days));
  const failedPerDay = Math.max(0, Math.round(failed / days));

  return Array.from({ length: days }, (_, i) => {
    const jitter = () => Math.floor((Math.random() - 0.5) * basePerDay * 0.4);
    const dayTotal = Math.max(0, basePerDay + jitter());
    const dayCompleted = Math.min(dayTotal, Math.max(0, completedPerDay + jitter()));
    const dayFailed = Math.min(dayTotal - dayCompleted, Math.max(0, failedPerDay + jitter()));
    const label =
      period === "today"
        ? "Today"
        : period === "week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]
        : `${i + 1}`;
    return { day: label, total: dayTotal, completed: dayCompleted, failed: dayFailed };
  });
}

// ─── Inner Page ───────────────────────────────────────────────────────────────

function AnalyticsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const period = (searchParams.get("period") as Period) ?? "today";

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`${pathname}?${params.toString()}`);
  }

  const { data: telemetry, isLoading } = useTelemetry({ period });

  // Map UI period to KPI API period
  const kpiPeriod: KPIPeriod = period === "month" ? "30d" : period === "week" ? "7d" : "today";
  const { data: kpis } = useKPIs(kpiPeriod);

  const total = kpis?.total_tasks ?? telemetry?.total_tasks ?? 0;
  const completed = kpis?.completed_tasks ?? telemetry?.completed_tasks ?? 0;
  const failed = kpis?.failed_tasks ?? telemetry?.failed_tasks ?? 0;
  const pending = kpis?.pending_tasks ?? Math.max(0, total - completed - failed);
  const successRate = telemetry?.success_rate ? Math.round(telemetry.success_rate * 100) : (total > 0 ? Math.round((completed / total) * 100) : 0);
  const avgTime = kpis?.avg_delivery_minutes ?? telemetry?.avg_delivery_time_minutes ?? 0;
  const onTimePct = kpis?.on_time_percent ?? 0;
  const activeRiders = kpis?.active_riders ?? 0;
  const totalRiders = kpis?.total_riders ?? 0;
  const utilizationPct = kpis?.utilization_percent ?? 0;

  const dailyData = buildDailyData(period, total, completed, failed);
  const pieData = STATUS_PIE_DATA(completed, failed, pending).filter((d) => d.value > 0);

  const metrics = [
    {
      label: "Total Deliveries",
      value: total,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "On-Time Rate",
      value: `${Math.round(onTimePct)}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Avg Delivery Time",
      value: avgTime ? `${Math.round(avgTime)}m` : "—",
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const fleetMetrics = [
    {
      label: "Active Riders",
      value: `${activeRiders} / ${totalRiders}`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Fleet Utilization",
      value: `${Math.round(utilizationPct)}%`,
      icon: Zap,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Failed / Cancelled",
      value: `${failed + (kpis?.cancelled_tasks ?? 0)}`,
      icon: Clock,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Delivery performance and fleet metrics.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-muted/20">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Delivery KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="border-border">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`p-2 rounded-lg ${m.bg}`}>
                      <Icon className={`size-4 ${m.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-xl font-bold">{m.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Fleet KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fleetMetrics.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="border-border">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`p-2 rounded-lg ${m.bg}`}>
                      <Icon className={`size-4 ${m.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-xl font-bold">{m.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Delivery Volume (Area) */}
            <Card className="lg:col-span-2 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4 text-primary" />
                  Delivery Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.destructive} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.destructive} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke={COLORS.success}
                      fill="url(#gradCompleted)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      name="Failed"
                      stroke={COLORS.destructive}
                      fill="url(#gradFailed)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Breakdown (Pie) */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No data for period.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Bar Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Daily Task Totals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="total" name="Total" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AnalyticsPageInner />
    </Suspense>
  );
}
