"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Banknote, ChevronRight, Clock, Loader2, MapPin, Plus, Search, UserCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { FeatureLock } from "@bengo-hub/shared-ui-lib/subscription";
import { Badge, Button, Card, Input } from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PermissionGate } from "@/components/ui/module-gate";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { useAssignTask, useDispatchTask, useTaskPod, useTasks } from "@/hooks/use-tasks";
import { useFleetMembers } from "@/hooks/use-fleet";
import { TASK_FILTERS, DELIVERED_STATUSES, taskStatusLabel, taskStatusTone, timeAgo } from "@/lib/task-status";
import { memberEmployment } from "@/lib/api/logistics";
import { orgRoute } from "@/lib/utils";
import type { FleetMember, Task } from "@/types/logistics";
import { MediaImage } from '@bengo-hub/shared-ui-lib/media';

const PAGE_SIZE = 20;

function taskCode(t: Task): string {
  return t.order_number || t.tracking_code || t.id.slice(0, 8).toUpperCase();
}

function riderLabel(m?: FleetMember): string {
  if (!m) return "Rider";
  return `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.phone || "Rider";
}

function SlaBadge({ slaDate, closed }: { slaDate: string | null; closed?: boolean }) {
  if (!slaDate || closed) return null;
  const hours = (new Date(slaDate).getTime() - Date.now()) / 3_600_000;
  if (hours < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3" /> Late
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${hours < 2 ? "font-medium text-warning" : "text-muted-foreground"}`}>
      <Clock className="size-3" /> {hours < 2 ? `${Math.round(hours * 60)}m left` : `${Math.round(hours)}h left`}
    </span>
  );
}

function TasksContent() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") || "all";
  const page = Number(searchParams.get("page") ?? 1);
  const search = searchParams.get("q") ?? "";
  const filter = TASK_FILTERS.find((f) => f.value === view) ?? TASK_FILTERS[0]!;

  const [searchInput, setSearchInput] = useState(search);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignMemberId, setAssignMemberId] = useState("");

  // ?new=1 (dashboard shortcut) opens the form once.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreate(true);
      const p = new URLSearchParams(searchParams.toString());
      p.delete("new");
      router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`);
    }
  }, [searchParams, pathname, router]);

  const { data, isLoading, error } = useTasks({
    status: filter.statuses.length ? filter.statuses.join(",") : undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const assignTask = useAssignTask();
  const dispatchTask = useDispatchTask();
  const { data: membersData } = useFleetMembers({ status: "active", limit: 100 });
  const riders = membersData?.data ?? [];
  const riderById = useMemo(() => new Map(riders.map((m) => [m.id, m])), [riders]);

  const podEligible = !!selectedTask && DELIVERED_STATUSES.includes(selectedTask.status);
  const { data: pod } = useTaskPod(selectedTask?.id ?? "", podEligible);

  const tasks = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value === null) p.delete(key);
    else p.set(key, value);
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  const handleAssign = () => {
    if (!selectedTask || !assignMemberId) return;
    assignTask.mutate(
      { taskId: selectedTask.id, fleetMemberId: assignMemberId },
      {
        onSuccess: () => {
          toast.success("Rider assigned");
          setAssignMemberId("");
          setSelectedTask(null);
        },
        onError: () => toast.error("Could not assign the rider"),
      },
    );
  };

  const handleDispatch = () => {
    if (!selectedTask) return;
    dispatchTask.mutate(selectedTask.id, {
      onSuccess: () => {
        toast.success("Sent to the nearest available rider");
        setSelectedTask(null);
      },
      onError: () => toast.error("No available rider nearby. Assign one by hand."),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total != null
              ? `${data.total.toLocaleString()} ${filter.value === "all" ? "in total" : filter.label.toLowerCase()}`
              : "Every delivery job, from waiting to delivered."}
          </p>
        </div>
        <PermissionGate permission="logistics.tasks.manage">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4" /> New delivery
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TASK_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={view === f.value ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setParam("view", f.value === "all" ? null : f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", searchInput.trim() || null);
          }}
          className="relative w-full lg:max-w-xs"
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Order number or tracking code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </form>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading deliveries...
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load deliveries. Check your connection and try again.
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <MapPin className="size-8 text-muted-foreground/60" />
          <p className="font-medium">{search || filter.value !== "all" ? "Nothing matches" : "No deliveries yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {search || filter.value !== "all"
              ? "Try another filter or clear the search."
              : "Online orders, POS deliveries and jobs you create here all land on this board."}
          </p>
        </Card>
      ) : (
        <>
          <Card className="divide-y divide-border overflow-hidden p-0">
            {tasks.map((task) => {
              const rider = task.assigned_rider_id ? riderById.get(task.assigned_rider_id) : undefined;
              const closed = ["delivered", "completed", "failed", "cancelled", "returned"].includes(task.status);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setAssignMemberId("");
                    setSelectedTask(task);
                  }}
                  className="grid w-full gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm font-semibold">{taskCode(task)}</span>
                      {task.priority !== "normal" && (
                        <Badge variant={task.priority === "urgent" ? "destructive" : "warning"} className="text-[10px] capitalize">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant={taskStatusTone(task.status)} className="text-xs">
                        {taskStatusLabel(task.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(task.created_at)}</span>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-0.5 text-xs">
                    {task.pickup_address || task.dropoff_address ? (
                      <>
                        <p className="flex items-center gap-1.5 truncate text-muted-foreground">
                          <span className="size-2 shrink-0 rounded-full bg-success" />
                          <span className="truncate">{task.pickup_address || "Pickup not set"}</span>
                        </p>
                        <p className="flex items-center gap-1.5 truncate">
                          <span className="size-2 shrink-0 rounded-full bg-destructive" />
                          <span className="truncate">{task.dropoff_address || "Drop-off not set"}</span>
                          {task.zone_name && <span className="shrink-0 text-muted-foreground">· {task.zone_name}</span>}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No stops on this job</p>
                    )}
                  </div>

                  <div className="min-w-0 text-xs">
                    {task.assigned_rider_id ? (
                      <p className="flex items-center gap-1.5 truncate">
                        <UserCheck className="size-3.5 shrink-0 text-success" />
                        <span className="truncate">{riderLabel(rider)}</span>
                      </p>
                    ) : closed ? null : (
                      <p className="font-medium text-warning">Needs a rider</p>
                    )}
                    {task.cash_on_delivery > 0 && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                        <Banknote className="size-3.5 shrink-0" /> Collect KES {task.cash_on_delivery.toLocaleString()}
                      </p>
                    )}
                    <SlaBadge slaDate={task.sla_due_at} closed={closed} />
                  </div>

                  <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
                </button>
              );
            })}
          </Card>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              const next = new URLSearchParams(searchParams.toString());
              next.set("page", String(p));
              router.push(`${pathname}?${next.toString()}`);
            }}
          />
        </>
      )}

      <Sheet
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <SheetContent side="right">
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{taskCode(selectedTask)}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <Badge variant={taskStatusTone(selectedTask.status)}>{taskStatusLabel(selectedTask.status)}</Badge>
                  <span className="text-xs capitalize">
                    {selectedTask.external_type.replace(/_/g, " ")} · {selectedTask.priority}
                  </span>
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-5">
                <div className="space-y-3">
                  <Stop
                    color="bg-success"
                    label="Pickup"
                    address={selectedTask.pickup_address}
                    contact={[selectedTask.pickup_contact_name, selectedTask.pickup_contact_phone]}
                  />
                  <Stop
                    color="bg-destructive"
                    label="Drop-off"
                    address={selectedTask.dropoff_address}
                    contact={[
                      selectedTask.dropoff_contact_name || selectedTask.customer_name,
                      selectedTask.dropoff_contact_phone || selectedTask.customer_phone,
                    ]}
                    extra={selectedTask.zone_name}
                  />
                </div>

                {(selectedTask.items_description || selectedTask.cash_on_delivery > 0 || selectedTask.instructions) && (
                  <div className="space-y-1 rounded-xl border border-border p-3 text-sm">
                    {selectedTask.items_description && <p>{selectedTask.items_description}</p>}
                    {selectedTask.instructions && <p className="text-muted-foreground">{selectedTask.instructions}</p>}
                    {selectedTask.cash_on_delivery > 0 && (
                      <p className="font-medium text-warning">
                        Rider collects KES {selectedTask.cash_on_delivery.toLocaleString()} (cash or M-Pesa)
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedTask.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Due</p>
                    {selectedTask.sla_due_at ? (
                      <SlaBadge slaDate={selectedTask.sla_due_at} />
                    ) : (
                      <p className="text-muted-foreground">No deadline</p>
                    )}
                  </div>
                </div>

                {selectedTask.assigned_rider_id && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Rider</p>
                    <p className="font-medium">
                      {riderLabel(riderById.get(selectedTask.assigned_rider_id))}
                      <span className="font-normal text-muted-foreground">
                        {selectedTask.assigned_at ? ` · assigned ${timeAgo(selectedTask.assigned_at)}` : ""}
                        {selectedTask.accepted_at ? " · accepted" : " · waiting for the rider to accept"}
                      </span>
                    </p>
                  </div>
                )}

                {podEligible && pod && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Proof of delivery</p>
                    {pod.photo_url && (
                      <MediaImage src={pod.photo_url} displayWidth={512} alt="Proof of delivery" className="max-h-48 w-full rounded-lg border border-border object-cover" />
                    )}
                    {pod.notes && <p className="mt-2 text-sm text-muted-foreground">{pod.notes}</p>}
                  </div>
                )}

                <PermissionGate permission="logistics.tasks.manage">
                  {selectedTask.status === "pending" && (
                    <div className="space-y-2 border-t border-border pt-4">
                      <p className="text-sm font-medium">Assign a rider</p>
                      {riders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No active riders.{" "}
                          <Link href={orgRoute(orgSlug, "/riders?invite=1")} className="font-medium text-primary hover:underline">
                            Add a rider
                          </Link>
                        </p>
                      ) : (
                        <>
                          <select
                            value={assignMemberId}
                            onChange={(e) => setAssignMemberId(e.target.value)}
                            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Choose a rider...</option>
                            {riders.map((m) => (
                              <option key={m.id} value={m.id}>
                                {riderLabel(m)}
                                {memberEmployment(m).type === "staff" ? " (staff)" : ""}
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" onClick={handleAssign} disabled={!assignMemberId || assignTask.isPending}>
                              {assignTask.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                              Assign
                            </Button>
                            <FeatureLock feature="auto_dispatch" mode="overlay">
                              <Button size="sm" variant="outline" className="w-full" onClick={handleDispatch} disabled={dispatchTask.isPending}>
                                {dispatchTask.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Zap className="mr-1 size-4" />}
                                Nearest rider
                              </Button>
                            </FeatureLock>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </PermissionGate>

                <Link href={orgRoute(orgSlug, `/tasks/${selectedTask.id}`)} className="block">
                  <Button variant="outline" className="w-full">
                    Open delivery <ArrowRight className="ml-1 size-4" />
                  </Button>
                </Link>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CreateTaskDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}

function Stop({
  color,
  label,
  address,
  contact,
  extra,
}: {
  color: string;
  label: string;
  address: string;
  contact: [string | undefined, string | undefined];
  extra?: string;
}) {
  const who = contact.filter(Boolean).join(" · ");
  return (
    <div className="flex gap-3 text-sm">
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${color}`} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {label}
          {extra ? ` · ${extra}` : ""}
        </p>
        <p className="font-medium">{address || "Not set"}</p>
        {who && <p className="text-xs text-muted-foreground">{who}</p>}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
