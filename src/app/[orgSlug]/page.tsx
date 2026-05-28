"use client";

import { useMemo } from "react";
import { Bike, Clock, MapPin, Package, TrendingUp, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base";
import { useFleet, useFleetMembers } from "@/hooks/use-fleet";
import { useTasks } from "@/hooks/use-tasks";
import { useTelemetry } from "@/hooks/use-telemetry";
import { useParams } from "next/navigation";
import { orgRoute } from "@/lib/utils";
import Link from "next/link";
import type { Task } from "@/types/logistics";

const statusColor: Record<string, string> = {
  pending: "bg-warning",
  assigned: "bg-primary",
  en_route: "bg-primary",
  en_route_pickup: "bg-primary",
  arrived_pickup: "bg-primary",
  picked_up: "bg-primary",
  en_route_dropoff: "bg-primary",
  arrived_dropoff: "bg-primary",
  delivered: "bg-success",
  completed: "bg-success",
  failed: "bg-destructive",
  cancelled: "bg-destructive",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMinutes(mins: number): string {
  if (!mins || isNaN(mins)) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

export default function DashboardPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const { data: fleet } = useFleet();
  const { data: membersData } = useFleetMembers({ status: "active", limit: 5 });
  const { data: allTasksData } = useTasks({ limit: 50 });
  const { data: pendingTasksData } = useTasks({ status: "pending", limit: 1 });
  const { data: telemetry } = useTelemetry({ period: "today" });

  const tasks = allTasksData?.data ?? [];
  const activeRiders = membersData?.total ?? fleet?.edges?.members?.filter(m => m.status === "active").length ?? 0;
  const pendingCount = pendingTasksData?.total ?? 0;
  const activeDeliveries = tasks.filter((t) =>
    ["assigned", "accepted", "en_route", "en_route_pickup", "arrived_pickup", "picked_up", "en_route_dropoff", "arrived_dropoff"].includes(t.status)
  ).length;

  const recentTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8),
    [tasks]
  );

  const metrics = [
    {
      title: "Active Deliveries",
      value: activeDeliveries,
      description: "Currently in progress",
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Riders Online",
      value: activeRiders,
      description: "Available for dispatch",
      icon: Users,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Tasks Pending",
      value: pendingCount,
      description: "Awaiting assignment",
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Avg. Delivery Time",
      value: formatMinutes(telemetry?.avg_delivery_time_minutes ?? 0),
      description: "Last 24 hours",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  const successRate = telemetry?.success_rate
    ? Math.round(telemetry.success_rate * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of your logistics operations.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                <div className={`p-2 rounded-lg ${metric.bg}`}>
                  <Icon className={`size-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Success Rate Banner */}
      {telemetry && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="size-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-xl font-bold">{successRate !== null ? `${successRate}%` : "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Deliveries</p>
                <p className="text-xl font-bold">{telemetry.total_tasks}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed Today</p>
                <p className="text-xl font-bold">{telemetry.failed_tasks}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Map */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" />
              Live Fleet Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
              <div className="text-center space-y-2">
                <Bike className="mx-auto size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Live map coming soon</p>
                <p className="text-xs text-muted-foreground/60">
                  Rider GPS positions via @bengo-hub/maps
                </p>
                <Link
                  href={orgRoute(orgSlug, "/tracking")}
                  className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                >
                  View Tracking →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Link
              href={orgRoute(orgSlug, "/tasks")}
              className="text-xs text-primary hover:underline font-medium"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task: Task) => (
                  <Link
                    key={task.id}
                    href={orgRoute(orgSlug, `/tasks/${task.id}`)}
                    className="flex items-start gap-3 group"
                  >
                    <div
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${statusColor[task.status] ?? "bg-muted-foreground"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono font-medium group-hover:text-primary transition-colors truncate">
                        {task.tracking_code || task.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatStatus(task.status)} · {timeAgo(task.updated_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Create Task", href: "/tasks", icon: Package },
          { label: "Add Rider", href: "/riders", icon: Users },
          { label: "View Tracking", href: "/tracking", icon: MapPin },
          { label: "Analytics", href: "/analytics", icon: TrendingUp },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={orgRoute(orgSlug, action.href)}>
              <Card className="border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
