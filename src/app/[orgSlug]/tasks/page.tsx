"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, Filter, Loader2, MapPin, Package, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";
import { orgRoute } from "@/lib/utils";
import { useTasks, useCreateTask } from "@/hooks/use-logistics";
import type { TaskStatus } from "@/types/logistics";

const statusVariant: Record<string, "warning" | "default" | "secondary" | "success" | "destructive"> = {
  pending: "warning",
  assigned: "default",
  accepted: "default",
  en_route: "secondary",
  en_route_pickup: "secondary",
  arrived_pickup: "secondary",
  picked_up: "secondary",
  en_route_dropoff: "secondary",
  arrived_dropoff: "secondary",
  delivered: "success",
  completed: "success",
  failed: "destructive",
  cancelled: "destructive",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type CreateTaskForm = {
  external_reference: string;
  task_type: string;
  priority: number;
  pickup_address: string;
  dropoff_address: string;
};

export default function TasksPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [activeFilter, setActiveFilter] = useState<TaskStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTaskForm>({
    external_reference: "",
    task_type: "delivery",
    priority: 1,
    pickup_address: "",
    dropoff_address: "",
  });

  const { data: tasks = [], isLoading, error } = useTasks(activeFilter);
  const createTaskMutation = useCreateTask();

  const handleCreateTask = () => {
    createTaskMutation.mutate(
      {
        external_reference: createForm.external_reference || undefined,
        task_type: createForm.task_type,
        priority: createForm.priority,
        metadata: {
          pickup_address: createForm.pickup_address,
          dropoff_address: createForm.dropoff_address,
        },
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setCreateForm({ external_reference: "", task_type: "delivery", priority: 1, pickup_address: "", dropoff_address: "" });
        },
      },
    );
  };

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
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="size-4" /> New Task
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "assigned", "en_route", "completed"] as const).map((s) => (
          <Button
            key={s}
            variant={activeFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(s)}
          >
            {s === "all" ? "All" : formatStatus(s)}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading tasks...</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Failed to load tasks.</p>
        </div>
      )}

      {!isLoading && !error && viewMode === "list" && (
        <div className="space-y-3">
          {tasks.map((task) => {
            const pickup = task.edges?.steps?.find((s) => s.step_type === "pickup");
            const dropoff = task.edges?.steps?.find((s) => s.step_type === "dropoff");
            const assignment = task.edges?.assignments?.[0];

            return (
              <Link key={task.id} href={orgRoute(orgSlug, `/tasks/${task.id}`)}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono text-sm">
                          {task.tracking_code || task.id.slice(0, 8)}
                        </span>
                        <Badge variant={statusVariant[task.status] ?? "secondary"} className="text-xs">
                          {formatStatus(task.status)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {task.task_type}
                        </Badge>
                      </div>
                      {pickup && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-success" />
                          <span>{pickup.location_name || "Pickup"}</span>
                        </div>
                      )}
                      {dropoff && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-destructive" />
                          <span>{dropoff.location_name || "Dropoff"}</span>
                        </div>
                      )}
                      {!pickup && !dropoff && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="size-4" />
                          <span>{task.external_reference || "No reference"}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {assignment && (
                        <span className="text-muted-foreground">
                          Assigned
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" /> {timeAgo(task.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && !error && viewMode === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Task Map View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[500px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <MapPin className="mx-auto size-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Map view will be available after @bengo-hub/maps integration
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && tasks.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No tasks match the selected filter.</p>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Task Type</label>
                <select
                  value={createForm.task_type}
                  onChange={(e) => setCreateForm((p) => ({ ...p, task_type: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pickup</option>
                  <option value="outlet_transfer">Outlet Transfer</option>
                  <option value="returns">Returns</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reference (optional)</label>
                <input
                  type="text"
                  value={createForm.external_reference}
                  onChange={(e) => setCreateForm((p) => ({ ...p, external_reference: e.target.value }))}
                  placeholder="e.g., ORD-12345"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Pickup Address</label>
                <input
                  type="text"
                  value={createForm.pickup_address}
                  onChange={(e) => setCreateForm((p) => ({ ...p, pickup_address: e.target.value }))}
                  placeholder="e.g., Westlands Mall, Nairobi"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Dropoff Address</label>
                <input
                  type="text"
                  value={createForm.dropoff_address}
                  onChange={(e) => setCreateForm((p) => ({ ...p, dropoff_address: e.target.value }))}
                  placeholder="e.g., Karen Estate, Nairobi"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={1}>Normal (1)</option>
                  <option value={2}>High (2)</option>
                  <option value={3}>Urgent (3)</option>
                </select>
              </div>
              {createTaskMutation.isError && (
                <p className="text-sm text-destructive">Failed to create task. Please try again.</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
