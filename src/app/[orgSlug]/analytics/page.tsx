"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Clock, Loader2, Package, Star, Timer, TrendingUp, Users, XCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/base";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import { ZoneStatsCard } from "@/components/zones/zone-stats-card";
import { useKPIs, useRiderStats, useSeries } from "@/hooks/use-analytics";
import type { KPIPeriod } from "@/lib/api/logistics";

// Every number here comes from the API: KPIs, the hourly or daily series and the rider table are
// aggregated in SQL over the tenant's tasks, with days counted in the business's time zone.

const PERIODS: Array<{ value: KPIPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const COLORS = {
  delivered: "hsl(var(--success, 142 71% 45%))",
  failed: "hsl(var(--destructive, 0 84% 60%))",
  cancelled: "hsl(var(--muted-foreground))",
};

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const pct = (n: number) => `${Math.round(n)}%`;
const mins = (n: number) => (n > 0 ? (n >= 60 ? `${Math.floor(n / 60)}h ${Math.round(n % 60)}m` : `${Math.round(n)} min`) : "No data");

function Stat({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: typeof Package; tone: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get("period");
  const period: KPIPeriod = PERIODS.some((p) => p.value === raw) ? (raw as KPIPeriod) : "7d";

  const setPeriod = (p: KPIPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`${pathname}?${params.toString()}`);
  };

  const kpis = useKPIs(period);
  const series = useSeries(period);
  const riders = useRiderStats(period);
  const k = kpis.data;

  const chart = useMemo(() => {
    const unit = series.data?.unit ?? "day";
    return (series.data?.points ?? []).map((p) => {
      const d = new Date(p.start);
      return {
        label:
          unit === "hour"
            ? d.toLocaleTimeString("en-KE", { hour: "numeric" })
            : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
        delivered: p.delivered,
        failed: p.failed,
        cancelled: p.cancelled,
        open: Math.max(0, p.total - p.delivered - p.failed - p.cancelled),
      };
    });
  }, [series.data]);

  const finished = (k?.completed_tasks ?? 0) + (k?.failed_tasks ?? 0);
  const successRate = finished > 0 ? ((k?.completed_tasks ?? 0) / finished) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">How deliveries went and how the fleet performed.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {kpis.isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading analytics...
        </div>
      ) : kpis.isError || !k ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">Could not load analytics. Try again shortly.</Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Deliveries" value={k.total_tasks.toLocaleString()} hint={`${k.pending_tasks} waiting, ${k.active_tasks} on the way`} icon={Package} tone="bg-primary/10 text-primary" />
            <Stat label="Delivered" value={k.completed_tasks.toLocaleString()} hint={finished > 0 ? `${pct(successRate)} of finished jobs` : undefined} icon={CheckCircle} tone="bg-success/10 text-success" />
            <Stat label="On time" value={k.on_time_percent > 0 ? pct(k.on_time_percent) : "No data"} hint="Delivered before the deadline" icon={TrendingUp} tone="bg-primary/10 text-primary" />
            <Stat label="Average delivery time" value={mins(k.avg_delivery_minutes)} hint="Order to proof of delivery" icon={Clock} tone="bg-warning/10 text-warning" />
            <Stat label="Failed" value={k.failed_tasks.toLocaleString()} icon={XCircle} tone="bg-destructive/10 text-destructive" />
            <Stat label="Cancelled" value={k.cancelled_tasks.toLocaleString()} icon={XCircle} tone="bg-muted text-muted-foreground" />
            <Stat label="Active riders" value={`${k.active_riders} of ${k.total_riders}`} hint="Approved and able to take jobs" icon={Users} tone="bg-primary/10 text-primary" />
            <Stat label="Riders who worked" value={`${k.riders_working}`} hint={k.active_riders > 0 ? `${pct(k.utilization_percent)} of active riders` : undefined} icon={Timer} tone="bg-success/10 text-success" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deliveries {period === "today" ? "by hour" : "by day"}</CardTitle>
              <CardDescription>By when the job was created. Open jobs are still waiting or on the way.</CardDescription>
            </CardHeader>
            <CardContent>
              {series.isLoading ? (
                <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
              ) : chart.every((c) => c.delivered + c.failed + c.cancelled + c.open === 0) ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No deliveries in this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" stackId="1" dataKey="delivered" name="Delivered" stroke={COLORS.delivered} fill={COLORS.delivered} fillOpacity={0.35} />
                    <Area type="monotone" stackId="1" dataKey="failed" name="Failed" stroke={COLORS.failed} fill={COLORS.failed} fillOpacity={0.35} />
                    <Area type="monotone" stackId="1" dataKey="cancelled" name="Cancelled" stroke={COLORS.cancelled} fill={COLORS.cancelled} fillOpacity={0.2} />
                    <Area type="monotone" stackId="1" dataKey="open" name="Open" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riders</CardTitle>
              <CardDescription>Jobs each rider held in the period, most deliveries first.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {riders.isLoading ? (
                <div className="m-4 h-32 animate-pulse rounded-lg bg-muted/40" />
              ) : (riders.data ?? []).length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">No rider jobs in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Rider</th>
                        <th className="px-4 py-2 text-right font-medium">Jobs</th>
                        <th className="px-4 py-2 text-right font-medium">Delivered</th>
                        <th className="px-4 py-2 text-right font-medium">Failed</th>
                        <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Avg time</th>
                        <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">On time</th>
                        <th className="px-4 py-2 text-right font-medium">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {riders.data!.map((r) => (
                        <tr key={r.fleet_member_id}>
                          <td className="px-4 py-2 font-medium">{r.name || "Rider"}</td>
                          <td className="px-4 py-2 text-right">{r.jobs}</td>
                          <td className="px-4 py-2 text-right text-success">{r.delivered}</td>
                          <td className="px-4 py-2 text-right text-destructive">{r.failed || ""}</td>
                          <td className="hidden px-4 py-2 text-right sm:table-cell">{r.avg_delivery_minutes > 0 ? mins(r.avg_delivery_minutes) : ""}</td>
                          <td className="hidden px-4 py-2 text-right sm:table-cell">{r.on_time_percent > 0 ? pct(r.on_time_percent) : ""}</td>
                          <td className="px-4 py-2 text-right">
                            {r.ratings > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Star className="size-3 fill-warning text-warning" />
                                {r.average_rating.toFixed(1)}
                              </span>
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <ZoneStatsCard period={period} />
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {/* Plan gate matches the API (driver_analytics); shows the upgrade card when missing. */}
      <SubscriptionGate feature="driver_analytics">
        <AnalyticsPageInner />
      </SubscriptionGate>
    </Suspense>
  );
}
