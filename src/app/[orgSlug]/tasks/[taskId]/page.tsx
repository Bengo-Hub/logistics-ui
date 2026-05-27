"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTaskStream } from "@/hooks/use-task-stream";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Package,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Clock,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";
import {
  useTask,
  useAssignTask,
  useDispatchTask,
  useFleetMembers,
} from "@/hooks/use-logistics";
import type { TaskStatus } from "@/types/logistics";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  accepted: "Accepted",
  en_route: "En Route",
  en_route_pickup: "En Route to Pickup",
  arrived_pickup: "Arrived at Pickup",
  picked_up: "Picked Up",
  en_route_dropoff: "En Route to Dropoff",
  arrived_dropoff: "Arrived at Dropoff",
  delivered: "Delivered",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const ASSIGNABLE_STATUSES: TaskStatus[] = ["pending"];

function formatTime(ts: string) {
  return new Date(ts).toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const taskId = params.taskId as string;

  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const qc = useQueryClient();
  const { data: task, isLoading, isError } = useTask(taskId);
  const { data: membersPage } = useFleetMembers("active");
  const members = membersPage?.data ?? [];
  const assignMutation = useAssignTask();
  const dispatchMutation = useDispatchTask();

  // Live SSE: auto-invalidate task query on status change
  const { connected: sseConnected } = useTaskStream({
    taskId,
    tenantSlug: orgSlug,
    enabled: !!task && !["completed", "cancelled", "failed"].includes(task?.status ?? ""),
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ["task", orgSlug, taskId] });
      qc.invalidateQueries({ queryKey: ["tasks", orgSlug] });
    },
  });

  const handleAssign = () => {
    if (!selectedMemberId) return;
    assignMutation.mutate(
      { taskId, fleetMemberId: selectedMemberId },
      {
        onSuccess: () => {
          setShowAssignPanel(false);
          setSelectedMemberId("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="mb-3 size-10 text-destructive" />
        <p className="text-lg font-bold">Task not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const pickup = task.edges?.steps?.find((s) => s.step_type === "pickup");
  const dropoff = task.edges?.steps?.find((s) => s.step_type === "dropoff");
  const assignment = task.edges?.assignments?.[0];
  const pod = task.edges?.proof_of_delivery;
  const canAssign = ASSIGNABLE_STATUSES.includes(task.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${orgSlug}/tasks`)}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {task.tracking_code || task.id.slice(0, 8)}
            </h1>
            <Badge variant={task.status === "pending" ? "warning" : "default"}>
              {STATUS_LABELS[task.status] ?? task.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {task.task_type} · created {formatTime(task.created_at)}
            {sseConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs">
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            )}
          </p>
        </div>
        {canAssign && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => dispatchMutation.mutate(taskId)}
              disabled={dispatchMutation.isPending}
            >
              {dispatchMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Zap className="mr-2 size-4" />
              )}
              Auto-Dispatch
            </Button>
            <Button onClick={() => setShowAssignPanel(true)}>
              <Truck className="mr-2 size-4" />
              Assign Rider
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Route */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" /> Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pickup ? (
              <div className="flex gap-3">
                <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <MapPin className="size-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pickup
                  </p>
                  <p className="font-medium">{pickup.location_name || "—"}</p>
                  {pickup.contact_name && (
                    <p className="text-sm text-muted-foreground">
                      {pickup.contact_name}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            {dropoff ? (
              <div className="flex gap-3">
                <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <MapPin className="size-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dropoff
                  </p>
                  <p className="font-medium">{dropoff.location_name || "—"}</p>
                  {dropoff.contact_name && (
                    <p className="text-sm text-muted-foreground">
                      {dropoff.contact_name}
                      {dropoff.contact_phone
                        ? ` · ${dropoff.contact_phone}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            {!pickup && !dropoff && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="size-4" />
                <span>
                  {task.external_reference
                    ? `Order: ${task.external_reference}`
                    : "No location data"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" /> Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignment ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="font-medium">
                    Rider assigned
                  </span>
                  <Badge variant="default" className="ml-auto">
                    {assignment.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Member ID:{" "}
                  <span className="font-mono text-xs">
                    {assignment.fleet_member_id}
                  </span>
                </p>
                {assignment.assigned_at && (
                  <p className="text-xs text-muted-foreground">
                    <Clock className="mr-1 inline size-3" />
                    {formatTime(assignment.assigned_at)}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <User className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No rider assigned yet
                </p>
                {canAssign && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssignPanel(true)}
                  >
                    Assign a Rider
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proof of delivery */}
        {pod && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4 text-green-500" /> Proof of
                Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6">
              {pod.photo_url && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Photo
                  </p>
                  <img
                    src={pod.photo_url}
                    alt="Proof of delivery"
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                </div>
              )}
              {pod.signature_url && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Signature
                  </p>
                  <img
                    src={pod.signature_url}
                    alt="Signature"
                    className="h-32 rounded-lg border bg-white object-contain px-2"
                  />
                </div>
              )}
              {pod.otp_code && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    OTP Verified
                  </p>
                  <p className="font-mono text-lg font-bold">{pod.otp_code}</p>
                </div>
              )}
              <p className="w-full text-xs text-muted-foreground">
                Submitted {formatTime(pod.created_at)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assign Rider panel */}
      {showAssignPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assign Rider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active riders available. Approve riders first from the
                  Riders page.
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Rider</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Choose a rider --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user_id} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAssignPanel(false);
                    setSelectedMemberId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedMemberId || assignMutation.isPending}
                  onClick={handleAssign}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Assign
                </Button>
              </div>
              {assignMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to assign rider. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
