"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Bike,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Radio,
  Search,
  Signal,
  X,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { useFleetMembers } from "@/hooks/use-fleet";
import { useTasks } from "@/hooks/use-tasks";
import { useTelemetry } from "@/hooks/use-telemetry";
import { useTaskStream } from "@/hooks/use-task-stream";
import { useQueryClient } from "@tanstack/react-query";
import { orgRoute } from "@/lib/utils";
import type { Task } from "@/types/logistics";

const ACTIVE_STATUSES = ["assigned", "accepted", "en_route", "en_route_pickup", "arrived_pickup", "picked_up", "en_route_dropoff", "arrived_dropoff"] as const;

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(s: string) {
  if (["delivered", "completed"].includes(s)) return "bg-success/15 text-success";
  if (["failed", "cancelled"].includes(s)) return "bg-destructive/15 text-destructive";
  if (s === "pending") return "bg-warning/15 text-warning";
  return "bg-primary/15 text-primary";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

// ─── Stream Panel ─────────────────────────────────────────────────────────────

interface StreamEvent {
  id: string;
  type: string;
  message: string;
  ts: string;
}

function TaskStreamPanel({
  taskId,
  tenantSlug,
  onClose,
}: {
  taskId: string;
  tenantSlug: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleEvent = useCallback(
    (evt: { event: string; data: { task_id: string; status: string; timestamp: string } }) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        {
          id: `${Date.now()}-${Math.random()}`,
          type: evt.event,
          message: evt.data.status ? `Status → ${statusLabel(evt.data.status)}` : evt.event,
          ts: evt.data.timestamp || new Date().toISOString(),
        },
      ]);

      if (evt.event === "status_changed") {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["task", tenantSlug, taskId] });
      }
    },
    [qc, tenantSlug, taskId]
  );

  const { connected } = useTaskStream({ taskId, tenantSlug, onEvent: handleEvent });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block size-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted-foreground"}`}
          />
          {connected ? "Live stream connected" : "Connecting…"}
        </CardTitle>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-40 overflow-y-auto px-4 pb-4 space-y-1.5">
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Waiting for events…</p>
          )}
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-2">
              <Activity className="mt-0.5 size-3 shrink-0 text-primary" />
              <div className="min-w-0">
                <span className="text-xs font-medium">{e.message}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function ActiveTaskRow({
  task,
  isSelected,
  onSelect,
  orgSlug,
}: {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  orgSlug: string;
}) {
  const router = useRouter();
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
        isSelected ? "border-primary/60 bg-primary/5" : "border-border hover:bg-muted/40"
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-mono font-semibold truncate">
          {task.tracking_code || task.id.slice(0, 8).toUpperCase()}
        </p>
        <p className="text-xs text-muted-foreground">
          {statusLabel(task.status)} · {timeAgo(task.updated_at)}
        </p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(task.status)}`}>
        {statusLabel(task.status)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          router.push(orgRoute(orgSlug, `/tasks/${task.id}`));
        }}
        title="Open task"
      >
        <ExternalLink className="size-3.5" />
      </Button>
    </div>
  );
}

// ─── Inner Page (uses useSearchParams) ────────────────────────────────────────

function TrackingPageInner() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCode = searchParams.get("waybill") || searchParams.get("orderId") || "";
  const [searchCode, setSearchCode] = useState(initialCode);
  const [streamTaskId, setStreamTaskId] = useState<string | null>(null);

  const { data: membersData, isLoading: membersLoading } = useFleetMembers({
    status: "active",
    limit: 50,
  });

  const { data: activeTasksData, isLoading: tasksLoading } = useTasks({
    status: "en_route",
    limit: 30,
  });

  // Also fetch assigned tasks — merge both
  const { data: assignedTasksData } = useTasks({ status: "assigned", limit: 30 });

  const { data: telemetry } = useTelemetry({ period: "today" });

  const activeRiders = membersData?.data ?? [];
  const allActiveTasks = [
    ...(activeTasksData?.data ?? []),
    ...(assignedTasksData?.data ?? []),
  ].filter(
    (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i
  );

  function handleTrackSearch() {
    const code = searchCode.trim();
    if (!code) return;
    window.open(`/track/${code}`, "_blank");
  }

  function handleSelectTask(taskId: string) {
    setStreamTaskId((prev) => (prev === taskId ? null : taskId));
  }

  const stats = [
    {
      label: "Riders Online",
      value: telemetry?.active_riders ?? activeRiders.length,
      icon: Bike,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Active Deliveries",
      value: allActiveTasks.length,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Today Completed",
      value: telemetry?.completed_tasks ?? 0,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Avg Delivery Time",
      value: telemetry?.avg_delivery_time_minutes
        ? `${Math.round(telemetry.avg_delivery_time_minutes)}m`
        : "—",
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Real-Time Tracking</h1>
        <p className="text-muted-foreground">Monitor fleet positions and delivery progress live.</p>
      </div>

      {/* Stats Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <Icon className={`size-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Track by code */}
      <Card className="border-border">
        <CardContent className="flex gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter tracking code or waybill number…"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrackSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleTrackSearch} disabled={!searchCode.trim()}>
            Track
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(orgRoute(orgSlug, "/tasks"))}
          >
            All Tasks
          </Button>
        </CardContent>
      </Card>

      {/* Map + Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Map */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Navigation className="size-4 text-primary" />
              Live Fleet Map
              <Badge variant="outline" className="ml-auto text-xs font-normal">
                <Signal className="mr-1 size-3 text-success" />
                Auto-refresh 10s
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-125 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
              <div className="text-center space-y-2">
                <Radio className="mx-auto size-12 text-primary/40 animate-pulse" />
                <p className="text-sm font-medium text-muted-foreground">Live map coming soon</p>
                <p className="text-xs text-muted-foreground/60">
                  Real-time rider GPS via @bengo-hub/maps
                </p>
                {activeRiders.length > 0 && (
                  <p className="text-xs text-success font-medium">
                    {activeRiders.length} rider{activeRiders.length !== 1 ? "s" : ""} active
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Active Riders */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bike className="size-4 text-primary" />
                Active Riders
                {activeRiders.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {activeRiders.length} online
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-52 overflow-y-auto">
              {membersLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!membersLoading && activeRiders.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">No riders online.</p>
              )}
              {activeRiders.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md border border-border p-2.5 hover:bg-muted/40"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bike className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {`${member.first_name} ${member.last_name}`.trim() || `Rider ${member.id.slice(0, 6)}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {member.status}
                    </p>
                  </div>
                  <span className="size-2 rounded-full bg-success" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-primary" />
                Active Tasks
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  click to stream
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-52 overflow-y-auto">
              {tasksLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!tasksLoading && allActiveTasks.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No active deliveries.
                </p>
              )}
              {allActiveTasks.map((task) => (
                <ActiveTaskRow
                  key={task.id}
                  task={task}
                  isSelected={streamTaskId === task.id}
                  onSelect={() => handleSelectTask(task.id)}
                  orgSlug={orgSlug}
                />
              ))}
            </CardContent>
          </Card>

          {/* SSE Stream Panel */}
          {streamTaskId && (
            <TaskStreamPanel
              taskId={streamTaskId}
              tenantSlug={orgSlug}
              onClose={() => setStreamTaskId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export (Suspense boundary for useSearchParams) ───────────────────────────

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TrackingPageInner />
    </Suspense>
  );
}
