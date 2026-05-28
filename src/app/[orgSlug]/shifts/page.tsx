"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Timer,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ModuleGate } from "@/components/ui/module-gate";
import {
  useShifts,
  useCreateShift,
  useStartShift,
  useEndShift,
  useUpdateShiftStatus,
} from "@/hooks/use-shifts";
import { useFleetMembers } from "@/hooks/use-fleet";
import type { CreateShiftRequest, RiderShift, ShiftStatus } from "@/types/logistics";
import { toast } from "sonner";

const STATUS_TABS: Array<{ value: ShiftStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusConfig: Record<ShiftStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; icon: typeof Clock }> = {
  scheduled: { label: "Scheduled", variant: "outline", icon: Calendar },
  active: { label: "Active", variant: "success", icon: Timer },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

function formatShiftTime(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString("en-KE", { dateStyle: "medium" });
  const startTime = s.toLocaleTimeString("en-KE", { timeStyle: "short" });
  const endTime = e.toLocaleTimeString("en-KE", { timeStyle: "short" });
  return `${dateStr}, ${startTime} – ${endTime}`;
}

function shiftDurationHours(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / 3_600_000);
}

// ─── Create Shift Dialog ──────────────────────────────────────────────────────

function CreateShiftDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: membersData } = useFleetMembers({ status: "active" });
  const members = membersData?.data ?? [];
  const create = useCreateShift();

  const [form, setForm] = useState<Partial<CreateShiftRequest>>({
    fleet_member_id: "",
    shift_start: "",
    shift_end: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fleet_member_id || !form.shift_start || !form.shift_end) return;
    create.mutate(form as CreateShiftRequest, {
      onSuccess: () => { toast.success("Shift created"); onClose(); },
      onError: () => toast.error("Failed to create shift"),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Rider</label>
            <select
              className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={form.fleet_member_id}
              onChange={(e) => setForm((f) => ({ ...f, fleet_member_id: e.target.value }))}
              required
            >
              <option value="">Select rider...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Shift Start</label>
            <Input
              className="mt-1"
              type="datetime-local"
              value={form.shift_start}
              onChange={(e) => setForm((f) => ({ ...f, shift_start: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Shift End</label>
            <Input
              className="mt-1"
              type="datetime-local"
              value={form.shift_end}
              onChange={(e) => setForm((f) => ({ ...f, shift_end: e.target.value }))}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shift Card ───────────────────────────────────────────────────────────────

function ShiftCard({ shift }: { shift: RiderShift }) {
  const startShift = useStartShift();
  const endShift = useEndShift();
  const updateStatus = useUpdateShiftStatus();

  const cfg = statusConfig[shift.status];
  const StatusIcon = cfg.icon;
  const member = shift.edges?.fleet_member;
  const memberName = member ? `${member.first_name} ${member.last_name}` : shift.fleet_member_id.slice(0, 8);

  function handleStart() {
    startShift.mutate(shift.id, {
      onSuccess: () => toast.success("Shift started"),
      onError: () => toast.error("Failed to start shift"),
    });
  }

  function handleEnd() {
    endShift.mutate(shift.id, {
      onSuccess: () => toast.success("Shift ended"),
      onError: () => toast.error("Failed to end shift"),
    });
  }

  function handleCancel() {
    updateStatus.mutate({ shiftId: shift.id, status: "cancelled" }, {
      onSuccess: () => toast.success("Shift cancelled"),
      onError: () => toast.error("Failed to cancel"),
    });
  }

  const isPending = startShift.isPending || endShift.isPending || updateStatus.isPending;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{memberName}</span>
              <Badge variant={cfg.variant} className="gap-1 text-xs">
                <StatusIcon className="h-3 w-3" /> {cfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3 inline mr-1" />
              {formatShiftTime(shift.shift_start, shift.shift_end)}
            </p>
            <p className="text-xs text-muted-foreground">
              Duration: {shiftDurationHours(shift.shift_start, shift.shift_end)}h
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {shift.status === "scheduled" && (
              <>
                <Button size="sm" variant="outline" onClick={handleStart} disabled={isPending}>
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
                  Cancel
                </Button>
              </>
            )}
            {shift.status === "active" && (
              <Button size="sm" variant="outline" onClick={handleEnd} disabled={isPending}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "End Shift"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ShiftsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = (searchParams.get("status") ?? "all") as ShiftStatus | "all";
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useShifts(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const shifts = data?.data ?? [];

  function setStatus(s: string) {
    const url = new URL(window.location.href);
    if (s === "all") url.searchParams.delete("status");
    else url.searchParams.set("status", s);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shifts</h1>
          <p className="text-muted-foreground text-sm">Manage rider shift schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Shift
          </Button>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading shifts...
        </div>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No shifts found</p>
            <p className="text-sm">Create a shift to assign riders to time slots</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shifts.map((s) => <ShiftCard key={s.id} shift={s} />)}
        </div>
      )}

      <CreateShiftDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

export default function ShiftsPage() {
  return (
    <ModuleGate
      moduleKey="shifts"
      fallback={
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Timer className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Shifts module not enabled</p>
          <p className="text-sm">Contact your administrator to enable this feature.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="flex items-center justify-center h-48">Loading...</div>}>
        <ShiftsContent />
      </Suspense>
    </ModuleGate>
  );
}
