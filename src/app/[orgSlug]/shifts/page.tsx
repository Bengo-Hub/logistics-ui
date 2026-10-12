"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Loader2, MapPin, Plus, Radio, Timer } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleGate, PermissionGate } from "@/components/ui/module-gate";
import { useCancelShift, useCreateShift, useDeleteShift, useEndShift, useShifts, useStartShift } from "@/hooks/use-shifts";
import { useFleetMembers } from "@/hooks/use-fleet";
import { useZones } from "@/hooks/use-zones";
import { apiErrorText } from "@/lib/utils";
import type { RiderShift, ShiftStatus } from "@/types/logistics";

// Riders go online in the rider app (that starts their scheduled shift, or an open-ended one);
// dispatchers schedule shifts here. Auto-dispatch offers a rider jobs in the areas their active
// shift covers first.

const VIEWS = [
  { value: "now", label: "On shift now" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const STATUS: Record<ShiftStatus, { label: string; tone: "success" | "outline" | "secondary" | "destructive" }> = {
  active: { label: "On shift", tone: "success" },
  scheduled: { label: "Scheduled", tone: "outline" },
  completed: { label: "Finished", tone: "secondary" },
  cancelled: { label: "Cancelled", tone: "destructive" },
};

const time = (d: Date) => d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
const day = (d: Date) => {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
};

function hoursBetween(a: string, b: string) {
  const h = (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
  return h >= 1 ? `${Math.round(h * 10) / 10}h` : `${Math.max(1, Math.round(h * 60))}m`;
}

/** datetime-local value (local time) for a Date. */
function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Schedule a shift ─────────────────────────────────────────────────────────

function CreateShiftDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: membersData } = useFleetMembers({ status: "active", limit: 100 });
  const members = membersData?.data ?? [];
  const create = useCreateShift();
  const { data: zones = [] } = useZones();
  const deliveryZones = zones.filter((z) => z.zone_type === "delivery" && z.status === "active");

  const [memberId, setMemberId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [zoneIds, setZoneIds] = useState<string[]>([]);

  const preset = (fromHour: number, toHour: number, dayOffset = 0) => {
    const s = new Date();
    s.setDate(s.getDate() + dayOffset);
    s.setHours(fromHour, 0, 0, 0);
    const e = new Date(s);
    e.setHours(toHour, 0, 0, 0);
    setStart(localInput(s));
    setEnd(localInput(e));
  };

  const reset = () => {
    setMemberId("");
    setStart("");
    setEnd("");
    setZoneIds([]);
  };

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const invalid = !!startDate && !!endDate && endDate <= startDate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !startDate || !endDate || invalid) return;
    create.mutate(
      // datetime-local has no zone; the API wants RFC3339.
      { fleet_member_id: memberId, shift_start: startDate.toISOString(), shift_end: endDate.toISOString(), zone_ids: zoneIds },
      {
        onSuccess: () => {
          toast.success("Shift scheduled");
          reset();
          onClose();
        },
        onError: (err) => toast.error(apiErrorText(err, "Could not schedule the shift")),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Rider
            <select
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
            >
              <option value="">Choose a rider...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.phone || m.email}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today 8am to 4pm", f: () => preset(8, 16) },
              { label: "Today 4pm to 11pm", f: () => preset(16, 23) },
              { label: "Tomorrow 8am to 4pm", f: () => preset(8, 16, 1) },
            ].map((p) => (
              <button key={p.label} type="button" onClick={p.f} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Starts
              <Input className="mt-1" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </label>
            <label className="text-sm font-medium">
              Ends
              <Input className="mt-1" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </label>
          </div>
          {invalid && <p className="text-sm text-destructive">The shift must end after it starts.</p>}

          {deliveryZones.length > 0 && (
            <div>
              <p className="text-sm font-medium">Areas covered (optional)</p>
              <p className="text-xs text-muted-foreground">Deliveries to these areas go to this rider first.</p>
              <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {deliveryZones.map((z) => {
                  const on = zoneIds.includes(z.id);
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setZoneIds((ids) => (on ? ids.filter((x) => x !== z.id) : [...ids, z.id]))}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                    >
                      {z.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || invalid || !memberId}>
              {create.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shift row ────────────────────────────────────────────────────────────────

function ShiftRow({ shift, zoneNames }: { shift: RiderShift; zoneNames: Map<string, string> }) {
  const startShift = useStartShift();
  const endShift = useEndShift();
  const cancelShift = useCancelShift();
  const deleteShift = useDeleteShift();
  const busy = startShift.isPending || endShift.isPending || cancelShift.isPending || deleteShift.isPending;
  const s = new Date(shift.shift_start);
  const e = new Date(shift.shift_end);
  const cfg = STATUS[shift.status];
  const areas = shift.zone_ids.map((id) => zoneNames.get(id)).filter(Boolean) as string[];

  const run = (m: { mutate: (id: string, o: object) => void }, ok: string, fail: string) =>
    m.mutate(shift.id, {
      onSuccess: () => toast.success(ok),
      onError: (err: unknown) => toast.error(apiErrorText(err, fail)),
    });

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{shift.rider_name || "Rider"}</span>
          <Badge variant={cfg.tone} className="text-xs">
            {shift.status === "active" && <Radio className="mr-1 size-3" />}
            {cfg.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {day(s)}, {time(s)} to {e.toDateString() === s.toDateString() ? time(e) : `${day(e)} ${time(e)}`} · {hoursBetween(shift.shift_start, shift.shift_end)}
        </p>
        {areas.length > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {areas.join(", ")}
          </p>
        )}
      </div>
      <PermissionGate permission="logistics.tasks.manage">
        <div className="flex shrink-0 gap-2">
          {shift.status === "scheduled" && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(startShift, "Shift started", "Could not start the shift")}>
                Start now
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(cancelShift, "Shift cancelled", "Could not cancel the shift")}>
                Cancel
              </Button>
            </>
          )}
          {shift.status === "active" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(endShift, "Shift ended", "Could not end the shift")}>
              End shift
            </Button>
          )}
          {shift.status === "cancelled" && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(deleteShift, "Shift removed", "Could not remove the shift")}>
              Remove
            </Button>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ShiftsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = ((searchParams.get("view") as View) || "now") as View;
  const [createOpen, setCreateOpen] = useState(false);

  // Each view is one query: active shifts, scheduled shifts still to come, finished in the last 14 days.
  const nowIso = useMemo(() => new Date().toISOString(), []);
  const pastFrom = useMemo(() => new Date(Date.now() - 14 * 86_400_000).toISOString(), []);
  const params =
    view === "now"
      ? { status: "active", limit: 100 }
      : view === "upcoming"
        ? { status: "scheduled", from: nowIso, limit: 100 }
        : { from: pastFrom, to: nowIso, limit: 100 };
  const { data, isLoading, error } = useShifts(params);
  const { data: activeData } = useShifts({ status: "active", limit: 100 });
  const { data: zones = [] } = useZones();
  const zoneNames = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);

  let shifts = data?.data ?? [];
  if (view === "past") shifts = shifts.filter((s) => s.status === "completed" || s.status === "cancelled");
  if (view === "upcoming") shifts = [...shifts].sort((a, b) => a.shift_start.localeCompare(b.shift_start));

  // Group by start day.
  const groups = useMemo(() => {
    const m = new Map<string, RiderShift[]>();
    for (const s of shifts) {
      const k = view === "now" ? "On shift now" : day(new Date(s.shift_start));
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [shifts, view]);

  const setView = (v: View) => {
    const p = new URLSearchParams(searchParams.toString());
    if (v === "now") p.delete("view");
    else p.set("view", v);
    router.push(`${pathname}${p.toString() ? `?${p}` : ""}`);
  };

  const onShift = activeData?.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shifts</h1>
          <p className="text-sm text-muted-foreground">
            {onShift === 0 ? "No rider is on shift right now." : `${onShift} rider${onShift === 1 ? "" : "s"} on shift right now.`} Riders
            go online from the rider app; schedule shifts here.
          </p>
        </div>
        <PermissionGate permission="logistics.tasks.manage">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Schedule shift
          </Button>
        </PermissionGate>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {VIEWS.map((v) => (
          <Button key={v.value} size="sm" className="shrink-0" variant={view === v.value ? "default" : "outline"} onClick={() => setView(v.value)}>
            {v.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading shifts...
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {apiErrorText(error, "Could not load shifts.")}
        </Card>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <CalendarClock className="size-8 text-muted-foreground/60" />
            <p className="font-medium">
              {view === "now" ? "Nobody is on shift" : view === "upcoming" ? "No shifts scheduled" : "No shifts in the last two weeks"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {view === "now"
                ? "A rider who goes online in the rider app shows up here."
                : "Schedule shifts so riders know when they work and dispatch knows who covers which area."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([label, list]) => (
            <div key={label} className="space-y-2">
              {view !== "now" && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
              <Card className="divide-y divide-border p-0">
                {list.map((s) => (
                  <ShiftRow key={s.id} shift={s} zoneNames={zoneNames} />
                ))}
              </Card>
            </div>
          ))}
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
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <Timer className="mb-3 size-10 opacity-30" />
          <p className="font-medium">Shifts are not turned on</p>
          <p className="text-sm">An admin can turn them on under Settings.</p>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ShiftsContent />
      </Suspense>
    </ModuleGate>
  );
}
