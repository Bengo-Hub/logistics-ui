"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  FileText,
  Loader2,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base";
import { useKPIs } from "@/hooks/use-analytics";
import { useFleetMembers } from "@/hooks/use-fleet";
import type { KPIPeriod } from "@/lib/api/logistics";

const PERIODS: Array<{ value: KPIPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

export default function ReportingPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [period, setPeriod] = useState<KPIPeriod>("7d");

  const { data: kpis, isLoading: kpisLoading } = useKPIs(period);
  const { data: membersData } = useFleetMembers({ status: "active", limit: 100 });

  const activeMembers = membersData?.data ?? [];

  function downloadCSV() {
    if (!kpis) return;
    const rows = [
      ["Metric", "Value"],
      ["Period", period],
      ["Total Tasks", kpis.total_tasks],
      ["Pending Tasks", kpis.pending_tasks],
      ["Active Tasks", kpis.active_tasks],
      ["Completed Tasks", kpis.completed_tasks],
      ["Failed Tasks", kpis.failed_tasks],
      ["Cancelled Tasks", kpis.cancelled_tasks],
      ["On-Time %", `${kpis.on_time_percent.toFixed(1)}%`],
      ["Active Riders", kpis.active_riders],
      ["Total Riders", kpis.total_riders],
      ["Fleet Utilization %", `${kpis.utilization_percent.toFixed(1)}%`],
      ["Avg Delivery (min)", kpis.avg_delivery_minutes.toFixed(1)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-summary-${period}-${orgSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Delivery summaries, rider performance, and exports.</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button size="sm" onClick={downloadCSV} disabled={kpisLoading || !kpis}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {kpisLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {kpis && (
        <>
          {/* Delivery Summary */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-primary" />
                Delivery Summary
                <Badge variant="outline" className="ml-auto text-xs">{period}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Total", value: kpis.total_tasks, color: "text-foreground" },
                  { label: "Completed", value: kpis.completed_tasks, color: "text-success" },
                  { label: "Active", value: kpis.active_tasks, color: "text-primary" },
                  { label: "Pending", value: kpis.pending_tasks, color: "text-warning" },
                  { label: "Failed", value: kpis.failed_tasks, color: "text-destructive" },
                  { label: "Cancelled", value: kpis.cancelled_tasks, color: "text-muted-foreground" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-muted/30">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  On-Time Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {kpis.on_time_percent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deliveries completed before SLA deadline
                </p>
                {/* Simple bar */}
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, kpis.on_time_percent)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Users className="size-3.5" />
                  Fleet Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {kpis.utilization_percent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.active_riders} of {kpis.total_riders} riders active
                </p>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{ width: `${Math.min(100, kpis.utilization_percent)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <FileText className="size-3.5" />
                  Avg Delivery Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {kpis.avg_delivery_minutes > 0
                    ? `${Math.round(kpis.avg_delivery_minutes)}m`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From task creation to completion
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rider Performance Table */}
          {activeMembers.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" />
                  Rider Performance
                  <Badge variant="outline" className="ml-auto text-xs">
                    {activeMembers.length} active riders
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rider</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avg Rating</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Total Ratings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase shrink-0">
                                {m.first_name?.[0] ?? "?"}
                              </div>
                              <span className="font-medium">
                                {m.first_name} {m.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge variant="success" className="text-xs capitalize">
                              {m.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">
                              {m.average_rating > 0
                                ? `${m.average_rating.toFixed(1)} ★`
                                : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                            {m.total_ratings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
