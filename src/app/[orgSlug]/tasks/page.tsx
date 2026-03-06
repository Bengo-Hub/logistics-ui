"use client";

import { useState } from "react";
import { Clock, Filter, MapPin, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";

type TaskStatus = "pending" | "assigned" | "in_progress" | "completed";

interface DeliveryTask {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: TaskStatus;
  riderName?: string;
  createdAt: string;
  estimatedTime?: string;
}

const statusVariant: Record<TaskStatus, "warning" | "default" | "secondary" | "success"> = {
  pending: "warning",
  assigned: "default",
  in_progress: "secondary",
  completed: "success",
};

const mockTasks: DeliveryTask[] = [
  { id: "TSK-1042", pickupAddress: "Westlands Mall, Nairobi", dropoffAddress: "Karen Estate, Nairobi", status: "in_progress", riderName: "John K.", createdAt: "10 min ago", estimatedTime: "25 min" },
  { id: "TSK-1041", pickupAddress: "Sarit Centre, Nairobi", dropoffAddress: "Kilimani, Nairobi", status: "assigned", riderName: "Jane W.", createdAt: "18 min ago", estimatedTime: "15 min" },
  { id: "TSK-1040", pickupAddress: "Village Market, Nairobi", dropoffAddress: "Runda, Nairobi", status: "pending", createdAt: "25 min ago" },
  { id: "TSK-1039", pickupAddress: "Two Rivers Mall", dropoffAddress: "Gigiri, Nairobi", status: "completed", riderName: "Peter O.", createdAt: "45 min ago", estimatedTime: "20 min" },
  { id: "TSK-1038", pickupAddress: "CBD Kenyatta Ave", dropoffAddress: "South B, Nairobi", status: "completed", riderName: "Mary A.", createdAt: "1 hr ago", estimatedTime: "30 min" },
];

export default function TasksPage() {
  const [activeFilter, setActiveFilter] = useState<TaskStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const filtered = mockTasks.filter(
    (t) => activeFilter === "all" || t.status === activeFilter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Tasks</h1>
          <p className="text-muted-foreground">
            Monitor and manage all delivery tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <Filter className="size-4" /> List
          </Button>
          <Button variant={viewMode === "map" ? "default" : "outline"} size="sm" onClick={() => setViewMode("map")}>
            <MapPin className="size-4" /> Map
          </Button>
          <Button size="sm">
            <Plus className="size-4" /> New Task
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "assigned", "in_progress", "completed"] as const).map((s) => (
          <Button
            key={s}
            variant={activeFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(s)}
          >
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {viewMode === "list" ? (
        <div className="space-y-3">
          {filtered.map((task) => (
            <Card key={task.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{task.id}</span>
                    <Badge variant={statusVariant[task.status]} className="text-xs">
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{task.pickupAddress}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>{task.dropoffAddress}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {task.riderName && (
                    <span className="text-muted-foreground">
                      Rider: <span className="font-medium text-foreground">{task.riderName}</span>
                    </span>
                  )}
                  {task.estimatedTime && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" /> {task.estimatedTime}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{task.createdAt}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Task Map View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[500px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <MapPin className="mx-auto size-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Map view showing task pickup/dropoff locations
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Leaflet / Mapbox integration placeholder
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No tasks match the selected filter.</p>
        </div>
      )}
    </div>
  );
}
