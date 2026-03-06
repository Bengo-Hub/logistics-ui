"use client";

import {
  Bike,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base";

const metrics = [
  {
    title: "Active Deliveries",
    value: "—",
    description: "Currently in progress",
    icon: Package,
    color: "text-primary",
  },
  {
    title: "Riders Online",
    value: "—",
    description: "Available for dispatch",
    icon: Users,
    color: "text-success",
  },
  {
    title: "Tasks Pending",
    value: "—",
    description: "Awaiting assignment",
    icon: Clock,
    color: "text-warning",
  },
  {
    title: "Avg. Delivery Time",
    value: "—",
    description: "Last 24 hours",
    icon: TrendingUp,
    color: "text-primary-dark",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time overview of your logistics operations.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className={`size-5 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Map Preview + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Live Delivery Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <Bike className="mx-auto size-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Map integration will display live rider locations
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Connect Leaflet / Mapbox in settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Task #1042 completed", time: "2 min ago", status: "success" },
                { label: "Rider John went online", time: "5 min ago", status: "info" },
                { label: "New task assigned", time: "8 min ago", status: "info" },
                { label: "Zone 'Downtown' updated", time: "15 min ago", status: "warning" },
                { label: "SLA breach on Task #1039", time: "22 min ago", status: "error" },
              ].map((event) => (
                <div key={event.label} className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      event.status === "success"
                        ? "bg-success"
                        : event.status === "error"
                          ? "bg-destructive"
                          : event.status === "warning"
                            ? "bg-warning"
                            : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
