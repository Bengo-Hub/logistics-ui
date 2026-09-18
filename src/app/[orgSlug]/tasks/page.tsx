"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTasks, useCreateTask, useUpdateTaskStatus, useAssignTask, useDispatchTask, useTaskPod } from "@/hooks/use-tasks";
import { useFleetMembers } from "@/hooks/use-fleet";
import type { Task, TaskStatus } from "@/types/logistics";
import { PermissionGate } from "@/components/ui/module-gate";
import { orgRoute } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

// "En Route" has no single matching status in the granular 9-state FSM (pending -> assigned
// -> accepted -> en_route_pickup -> arrived_pickup -> picked_up -> en_route_dropoff ->
// arrived_dropoff -> delivered) -- it's sent as a comma-joined value logistics-api's
// ListTasksFilter.Statuses OR-matches (see logistics.go's ListTasks). "value" is a plain
// string rather than TaskStatus specifically to allow that joined form.
const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "en_route_pickup,en_route_dropoff", label: "En Route" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
];

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

const statusIcon: Record<string, typeof Clock> = {
  pending: Clock,
  delivered: CheckCircle,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SlaBadge({ slaDate }: { slaDate: string | null }) {
  if (!slaDate) return null;
  const remaining = new Date(slaDate).getTime() - Date.now();
  const hours = remaining / 3_600_000;
  if (hours < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3" /> SLA Breached
      </span>
    );
  }
  if (hours < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
        <Clock className="size-3" /> {Math.round(hours * 60)}m left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="size-3" /> {Math.round(hours)}h left
    </span>
  );
}

type CreateTaskForm = {
  external_reference: string;
  task_type: string;
  priority: number;
  pickup_address: string;
  dropoff_address: string;
};

function TasksContent() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilter = searchParams.get("status") || "all";
  const page = Number(searchParams.get("page") ?? 1);
  const search = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTaskForm>({
    external_reference: "",
    task_type: "delivery",
    priority: 1,
    pickup_address: "",
    dropoff_address: "",
  });
  const [assignMemberId, setAssignMemberId] = useState("");
  const podEligible = selectedTask?.status === "delivered" || selectedTask?.status === "completed";
  const { data: pod } = useTaskPod(selectedTask?.id ?? "", podEligible);

  const { data, isLoading, error } = useTasks({
    status: activeFilter !== "all" ? activeFilter : undefined,
    search: search || undefined,
    page,
    limit: 20,
  });
  const createTaskMutation = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const assignTask = useAssignTask();
  const dispatchTask = useDispatchTask();
  const { data: membersData } = useFleetMembers({ status: "active" });

  const tasks = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value === null) p.delete(key);
    else p.set(key, value);
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", searchInput || null);
  };

  const handleCreate = () => {
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
          setShowCreate(false);
          setCreateForm({ external_reference: "", task_type: "delivery", priority: 1, pickup_address: "", dropoff_address: "" });
          toast.success("Task created successfully");
        },
        onError: () => toast.error("Failed to create task"),
      }
    );
  };

  const handleAssign = () => {
    if (!selectedTask || !assignMemberId) return;
    assignTask.mutate(
      { taskId: selectedTask.id, fleetMemberId: assignMemberId },
      {
        onSuccess: () => { toast.success("Rider assigned"); setAssignMemberId(""); },
        onError: () => toast.error("Failed to assign rider"),
      }
    );
  };

  const handleDispatch = () => {
    if (!selectedTask) return;
    dispatchTask.mutate(selectedTask.id, {
      onSuccess: () => toast.success("Task dispatched"),
      onError: () => toast.error("Dispatch failed"),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Tasks</h1>
          <p className="text-muted-foreground">
            {data?.total != null ? `${data.total} tasks total` : "Monitor and manage deliveries."}
          </p>
        </div>
        <PermissionGate permission="logistics.tasks.manage">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4" /> New Task
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by tracking code or reference..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={activeFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setParam("status", tab.value === "all" ? null : tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading tasks...</span>
        </div>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">Failed to load tasks. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Task</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Route</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">SLA</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No tasks match the current filters.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const StatusIcon = statusIcon[task.status] ?? Truck;
                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => setSelectedTask(task)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs font-semibold">
                              {task.tracking_code || task.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                              {task.external_type} · {task.priority}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon className="size-3.5 shrink-0" />
                              <Badge variant={statusVariant[task.status] ?? "secondary"} className="text-xs">
                                {formatStatus(task.status)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="space-y-0.5">
                              {task.pickup_address && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="size-3 text-success shrink-0" />
                                  <span className="truncate max-w-35">{task.pickup_address}</span>
                                </div>
                              )}
                              {task.dropoff_address && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="size-3 text-destructive shrink-0" />
                                  <span className="truncate max-w-35">{task.dropoff_address}</span>
                                </div>
                              )}
                              {!task.pickup_address && !task.dropoff_address && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Package className="size-3" />
                                  <span>{task.external_reference || "No reference"}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <SlaBadge slaDate={task.sla_due_at} />
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{timeAgo(task.created_at)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={orgRoute(orgSlug, `/tasks/${task.id}`)}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                title="View details"
                              >
                                <MoreHorizontal className="size-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              const params2 = new URLSearchParams(searchParams.toString());
              params2.set("page", String(p));
              router.push(`${pathname}?${params2.toString()}`);
            }}
            className="mt-4"
          />
        </>
      )}

      {/* Task Detail Drawer */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <SheetContent side="right">
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">
                  {selectedTask.tracking_code || selectedTask.id.slice(0, 8).toUpperCase()}
                </SheetTitle>
                <SheetDescription>
                  <Badge variant={statusVariant[selectedTask.status] ?? "secondary"}>
                    {formatStatus(selectedTask.status)}
                  </Badge>
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <p className="font-medium capitalize">{selectedTask.external_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Priority</p>
                    <p className="font-medium capitalize">{selectedTask.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="font-medium">{new Date(selectedTask.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SLA</p>
                    <SlaBadge slaDate={selectedTask.sla_due_at} />
                  </div>
                </div>

                {(selectedTask.pickup_address || selectedTask.dropoff_address) && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Stops</p>
                    <div className="space-y-2">
                      {selectedTask.pickup_address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="size-4 mt-0.5 shrink-0 text-success" />
                          <div>
                            <p className="font-medium">{selectedTask.pickup_address}</p>
                            {selectedTask.pickup_contact_name && (
                              <p className="text-xs text-muted-foreground">
                                {selectedTask.pickup_contact_name} · {selectedTask.pickup_contact_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedTask.dropoff_address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="size-4 mt-0.5 shrink-0 text-destructive" />
                          <div>
                            <p className="font-medium">{selectedTask.dropoff_address}</p>
                            {selectedTask.dropoff_contact_name && (
                              <p className="text-xs text-muted-foreground">
                                {selectedTask.dropoff_contact_name} · {selectedTask.dropoff_contact_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTask.assigned_rider_id && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Assignment</p>
                    <p className="text-sm">
                      Rider assigned{selectedTask.assigned_at ? ` · ${timeAgo(selectedTask.assigned_at)}` : ""}
                      {selectedTask.accepted_at ? " · Accepted" : ""}
                    </p>
                  </div>
                )}

                {podEligible && pod && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Proof of Delivery</p>
                    {pod.photo_url && (
                      <img
                        src={pod.photo_url}
                        alt="Proof of delivery"
                        className="rounded-lg border border-border w-full max-h-48 object-cover"
                      />
                    )}
                    {pod.notes && (
                      <p className="text-sm mt-2 text-muted-foreground">{pod.notes}</p>
                    )}
                  </div>
                )}

                {/* Assign Rider */}
                <PermissionGate permission="logistics.tasks.dispatch">
                  {["pending", "assigned"].includes(selectedTask.status) && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Rider</p>
                      <select
                        value={assignMemberId}
                        onChange={(e) => setAssignMemberId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select rider...</option>
                        {membersData?.data?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.first_name} {m.last_name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleAssign}
                        disabled={!assignMemberId || assignTask.isPending}
                      >
                        {assignTask.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                        Assign Rider
                      </Button>
                    </div>
                  )}

                  {/* Dispatch */}
                  {selectedTask.status === "assigned" && (
                    <Button
                      className="w-full"
                      onClick={handleDispatch}
                      disabled={dispatchTask.isPending}
                    >
                      {dispatchTask.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                      Dispatch Task
                    </Button>
                  )}
                </PermissionGate>

                <Link
                  href={orgRoute(orgSlug, `/tasks/${selectedTask.id}`)}
                  className="block w-full"
                >
                  <Button variant="outline" className="w-full">View Full Details</Button>
                </Link>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Task Type</label>
              <select
                value={createForm.task_type}
                onChange={(e) => setCreateForm((p) => ({ ...p, task_type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
                <option value="outlet_transfer">Outlet Transfer</option>
                <option value="returns">Returns</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Reference (optional)</label>
              <Input
                className="mt-1"
                value={createForm.external_reference}
                onChange={(e) => setCreateForm((p) => ({ ...p, external_reference: e.target.value }))}
                placeholder="e.g., ORD-12345"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Pickup Address</label>
              <Input
                className="mt-1"
                value={createForm.pickup_address}
                onChange={(e) => setCreateForm((p) => ({ ...p, pickup_address: e.target.value }))}
                placeholder="e.g., Westlands Mall, Nairobi"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dropoff Address</label>
              <Input
                className="mt-1"
                value={createForm.dropoff_address}
                onChange={(e) => setCreateForm((p) => ({ ...p, dropoff_address: e.target.value }))}
                placeholder="e.g., Karen Estate, Nairobi"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={1}>Normal</option>
                <option value={2}>High</option>
                <option value={3}>Urgent</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
