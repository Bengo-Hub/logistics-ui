"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, Loader2, Radio, Search, Star, Trash2, Truck, UserPlus, Users, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Input } from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PermissionGate } from "@/components/ui/module-gate";
import { InviteRiderDialog } from "@/components/riders/invite-rider-dialog";
import {
  useApproveMember,
  useBatchInviteMembers,
  useDeleteMember,
  useFleetMembers,
  useRejectMember,
  useSetMemberEmployment,
  useSuspendMember,
} from "@/hooks/use-fleet";
import { useShifts } from "@/hooks/use-shifts";
import { useTasks } from "@/hooks/use-tasks";
import { memberEmployment, type EmploymentType } from "@/lib/api/logistics";
import { taskStatusLabel, taskStatusTone, timeAgo } from "@/lib/task-status";
import { apiErrorText, orgRoute } from "@/lib/utils";
import { AWAITING_APPROVAL, type FleetMember, type FleetMemberStatus } from "@/types/logistics";

const PAGE_SIZE = 20;

const STATUS: Record<FleetMemberStatus, { label: string; tone: "success" | "warning" | "destructive" | "secondary" }> = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "secondary" },
  pending: { label: "Signed up, no documents", tone: "warning" },
  pending_review: { label: "Documents to review", tone: "warning" },
  suspended: { label: "Suspended", tone: "destructive" },
  rejected: { label: "Rejected", tone: "secondary" },
};

const WAITING = AWAITING_APPROVAL.join(",");

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: WAITING, label: "Waiting for approval" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

type ConfirmAction = { type: "approve" | "suspend" | "reject" | "delete"; member: FleetMember };

const CONFIRM: Record<ConfirmAction["type"], { title: string; description: string; action: string; destructive: boolean }> = {
  approve: { title: "Approve rider", description: "They can go online and take deliveries.", action: "Approve", destructive: false },
  suspend: { title: "Suspend rider", description: "They stop getting jobs until you reinstate them.", action: "Suspend", destructive: true },
  reject: { title: "Reject rider", description: "Their application is closed.", action: "Reject", destructive: true },
  delete: { title: "Remove rider", description: "They are removed from your fleet. Their past jobs stay on record.", action: "Remove", destructive: true },
};

function fullName(m: Pick<FleetMember, "first_name" | "last_name" | "phone" | "email">) {
  return `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.phone || m.email || "Rider";
}

function Avatar({ member, size = "sm" }: { member: FleetMember; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "size-12 text-lg" : "size-9 text-sm";
  if (member.rider_photo) {
    return <img src={member.rider_photo} alt="" className={`${cls} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold uppercase text-primary`}>
      {fullName(member)[0]}
    </div>
  );
}

function Rating({ member }: { member: FleetMember }) {
  if (!member.total_ratings) return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Star className="size-3 fill-warning text-warning" />
      {member.average_rating.toFixed(1)}
      <span className="text-muted-foreground">({member.total_ratings})</span>
    </span>
  );
}

// Freelance riders earn per delivery; staff are on HR payroll (per diem is claimed in HR).
function EmploymentToggle({ member }: { member: FleetMember }) {
  const setEmployment = useSetMemberEmployment();
  const current = memberEmployment(member).type;
  const change = (type: EmploymentType) => {
    setEmployment.mutate(
      { memberId: member.id, type },
      {
        onSuccess: () => toast.success(type === "staff" ? "Marked as staff (payroll)" : "Marked as freelance"),
        onError: (err) => toast.error(apiErrorText(err, "Could not change how this rider is engaged")),
      },
    );
  };
  return (
    <div className="mt-1 flex items-center gap-2">
      <Badge variant={current === "staff" ? "secondary" : "success"}>{current === "staff" ? "Staff (payroll)" : "Freelance"}</Badge>
      <PermissionGate permission="logistics.fleet.manage">
        <Button size="sm" variant="ghost" disabled={setEmployment.isPending} onClick={() => change(current === "staff" ? "freelance" : "staff")}>
          {current === "staff" ? "Make freelance" : "Make staff"}
        </Button>
      </PermissionGate>
    </div>
  );
}

function RecentJobs({ memberId, orgSlug }: { memberId: string; orgSlug: string }) {
  const { data, isLoading } = useTasks({ rider_id: memberId, limit: 5 });
  const jobs = data?.data ?? [];
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading jobs...
      </p>
    );
  }
  if (jobs.length === 0) return <p className="py-3 text-sm text-muted-foreground">No jobs yet.</p>;
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {jobs.map((t) => (
        <Link key={t.id} href={orgRoute(orgSlug, `/tasks/${t.id}`)} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/40">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-semibold">{t.order_number || t.tracking_code}</p>
            <p className="truncate text-xs text-muted-foreground">{t.dropoff_address || "No drop-off"}</p>
          </div>
          <div className="shrink-0 text-right">
            <Badge variant={taskStatusTone(t.status)} className="text-[10px]">
              {taskStatusLabel(t.status)}
            </Badge>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(t.created_at)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

const EMPTY_ROW = { first_name: "", last_name: "", email: "", phone: "" };

function BatchInviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const batchInvite = useBatchInviteMembers();
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [employment, setEmployment] = useState<EmploymentType>("freelance");
  const [failed, setFailed] = useState<Array<{ email: string; error: string }>>([]);

  const close = () => {
    setRows([{ ...EMPTY_ROW }]);
    setFailed([]);
    onOpenChange(false);
  };
  const setCell = (i: number, k: keyof typeof EMPTY_ROW, v: string) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  const send = () => {
    const valid = rows.filter((r) => r.email.trim());
    if (!valid.length) return;
    batchInvite.mutate(
      valid.map((r) => ({ ...r, email: r.email.trim(), employment: { type: employment } })),
      {
        onSuccess: (results) => {
          const bad = results.filter((r) => r.error).map((r) => ({ email: r.email, error: r.error! }));
          const ok = results.length - bad.length;
          if (ok > 0) toast.success(`${ok} rider${ok === 1 ? "" : "s"} invited`);
          if (bad.length === 0) {
            close();
            return;
          }
          // Keep only the rows that failed so they can be fixed and sent again.
          setFailed(bad);
          setRows(valid.filter((r) => bad.some((b) => b.email === r.email.trim())));
        },
        onError: (err) => toast.error(apiErrorText(err, "Could not send the invites")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Invite several riders</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">They are</span>
          {(["freelance", "staff"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEmployment(t)}
              className={`rounded-full border px-3 py-1 text-xs ${employment === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {t === "staff" ? "Staff (payroll, no documents needed)" : "Freelance (paid per delivery)"}
            </button>
          ))}
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {rows.map((row, i) => {
            const err = failed.find((f) => f.email === row.email.trim());
            return (
              <div key={i}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input placeholder="First name" value={row.first_name} onChange={(e) => setCell(i, "first_name", e.target.value)} />
                  <Input placeholder="Last name" value={row.last_name} onChange={(e) => setCell(i, "last_name", e.target.value)} />
                  <Input placeholder="Email (required)" type="email" value={row.email} onChange={(e) => setCell(i, "email", e.target.value)} />
                  <Input placeholder="Phone" inputMode="tel" value={row.phone} onChange={(e) => setCell(i, "phone", e.target.value)} />
                </div>
                {err && <p className="mt-1 text-xs text-destructive">{err.error}</p>}
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, { ...EMPTY_ROW }])}>
          Add another
        </Button>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={send} disabled={batchInvite.isPending || !rows.some((r) => r.email.trim())}>
            {batchInvite.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Send invites
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RidersContent() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilter = searchParams.get("status") || "all";
  const page = Number(searchParams.get("page") ?? 1);
  const search = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(search);
  const [selected, setSelected] = useState<FleetMember | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [showBatch, setShowBatch] = useState(false);

  // ?invite=1 opens the add-rider form, so other apps link here instead of copying it.
  const showInvite = searchParams.get("invite") === "1";
  const setInviteOpen = (open: boolean) => {
    const p = new URLSearchParams(searchParams.toString());
    if (open) p.set("invite", "1");
    else p.delete("invite");
    router.replace(`${pathname}?${p.toString()}`);
  };

  const { data, isLoading, error } = useFleetMembers({
    status: activeFilter !== "all" ? activeFilter : undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const { data: pendingData } = useFleetMembers({ status: WAITING, limit: 1 });
  const { data: activeShifts } = useShifts({ status: "active", limit: 100 });
  const onShift = useMemo(() => new Set((activeShifts?.data ?? []).map((s) => s.fleet_member_id)), [activeShifts]);

  const approve = useApproveMember();
  const suspend = useSuspendMember();
  const reject = useRejectMember();
  const remove = useDeleteMember();
  const busy = approve.isPending || suspend.isPending || reject.isPending || remove.isPending;

  const members = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const waiting = pendingData?.total ?? 0;

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value === null) p.delete(key);
    else p.set(key, value);
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  const runConfirm = () => {
    if (!confirm) return;
    const { type, member } = confirm;
    const done = (msg: string) => () => {
      toast.success(msg);
      setConfirm(null);
      if (type === "delete") setSelected(null);
    };
    const fail = (msg: string) => (err: unknown) => toast.error(apiErrorText(err, msg));
    if (type === "approve") approve.mutate(member.id, { onSuccess: done("Rider approved"), onError: fail("Could not approve the rider") });
    if (type === "suspend") suspend.mutate(member.id, { onSuccess: done("Rider suspended"), onError: fail("Could not suspend the rider") });
    if (type === "reject") reject.mutate({ memberId: member.id }, { onSuccess: done("Rider rejected"), onError: fail("Could not reject the rider") });
    if (type === "delete") remove.mutate(member.id, { onSuccess: done("Rider removed"), onError: fail("Could not remove the rider") });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riders</h1>
          <p className="text-sm text-muted-foreground">
            {onShift.size} on shift now
            {waiting > 0 ? ` · ${waiting} waiting for approval` : ""}
            {data?.total != null && activeFilter === "all" ? ` · ${data.total} in total` : ""}
          </p>
        </div>
        <PermissionGate permission="logistics.fleet.manage">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBatch(true)}>
              <Users className="size-4" /> Invite several
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" /> Add rider
            </Button>
          </div>
        </PermissionGate>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              className="shrink-0"
              variant={activeFilter === f.value ? "default" : "outline"}
              onClick={() => setParam("status", f.value === "all" ? null : f.value)}
            >
              {f.label}
              {f.value === WAITING && waiting > 0 ? ` (${waiting})` : ""}
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
          <Input placeholder="Name, phone or email" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
        </form>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading riders...
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{apiErrorText(error, "Could not load riders.")}</Card>
      ) : members.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Users className="size-8 text-muted-foreground/60" />
          <p className="font-medium">{search || activeFilter !== "all" ? "Nobody matches" : "No riders yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {search || activeFilter !== "all"
              ? "Try another filter or clear the search."
              : "Add your riders so deliveries can be dispatched. Staff riders need no documents."}
          </p>
          {!search && activeFilter === "all" && (
            <PermissionGate permission="logistics.fleet.manage">
              <Button size="sm" className="mt-2" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4" /> Add rider
              </Button>
            </PermissionGate>
          )}
        </Card>
      ) : (
        <>
          <Card className="divide-y divide-border overflow-hidden p-0">
            {members.map((m) => {
              const st = STATUS[m.status] ?? STATUS.pending;
              const staff = memberEmployment(m).type === "staff";
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                  <button type="button" onClick={() => setSelected(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="relative">
                      <Avatar member={m} />
                      {onShift.has(m.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" title="On shift" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{fullName(m)}</span>
                        {staff && (
                          <Badge variant="secondary" className="text-[10px]">
                            Staff
                          </Badge>
                        )}
                        {m.status !== "active" && (
                          <Badge variant={st.tone} className="text-[10px]">
                            {st.label}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {m.phone && <span>{m.phone}</span>}
                        <Rating member={m} />
                        {onShift.has(m.id) && <span className="font-medium text-success">On shift</span>}
                      </div>
                    </div>
                  </button>
                  <PermissionGate permission="logistics.fleet.manage">
                    {AWAITING_APPROVAL.includes(m.status) && (
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "approve", member: m })}>
                          <CheckCircle className="size-4 text-success" /> <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm({ type: "reject", member: m })} title="Reject">
                          <XCircle className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {m.status === "suspended" && (
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => setConfirm({ type: "approve", member: m })}>
                        Reinstate
                      </Button>
                    )}
                  </PermissionGate>
                </div>
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
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent side="right">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar member={selected} size="lg" />
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{fullName(selected)}</SheetTitle>
                    <SheetDescription className="flex flex-wrap items-center gap-2">
                      <Badge variant={(STATUS[selected.status] ?? STATUS.pending).tone}>{(STATUS[selected.status] ?? STATUS.pending).label}</Badge>
                      {onShift.has(selected.id) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <Radio className="size-3" /> On shift
                        </span>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody className="space-y-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selected.phone || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <Rating member={selected} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="truncate font-medium">{selected.email || "Not set"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Engagement</p>
                    <EmploymentToggle member={selected} />
                  </div>
                  {selected.emergency_contact_name && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Emergency contact</p>
                      <p className="font-medium">
                        {selected.emergency_contact_name}
                        {selected.emergency_contact_phone ? ` · ${selected.emergency_contact_phone}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Vehicle</p>
                  {selected.edges?.vehicles?.length ? (
                    selected.edges.vehicles.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                        <Truck className="size-4 text-primary" />
                        <span className="font-medium">
                          {[v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type}
                        </span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">{v.license_plate}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No vehicle assigned.</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Recent jobs</p>
                  <RecentJobs memberId={selected.id} orgSlug={orgSlug} />
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <PermissionGate permission="logistics.fleet.manage">
                    {AWAITING_APPROVAL.includes(selected.status) && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={() => setConfirm({ type: "approve", member: selected })}>
                          <CheckCircle className="size-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "reject", member: selected })}>
                          <XCircle className="size-4" /> Reject
                        </Button>
                      </div>
                    )}
                    {selected.status === "active" && (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setConfirm({ type: "suspend", member: selected })}>
                        <UserX className="size-4" /> Suspend
                      </Button>
                    )}
                  </PermissionGate>
                  <Link href={orgRoute(orgSlug, `/riders/${selected.id}`)} className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Documents and full profile <ArrowRight className="ml-1 size-4" />
                    </Button>
                  </Link>
                  <PermissionGate permission="logistics.fleet.manage">
                    <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => setConfirm({ type: "delete", member: selected })}>
                      <Trash2 className="size-4" /> Remove from fleet
                    </Button>
                  </PermissionGate>
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          {confirm && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {CONFIRM[confirm.type].title}: {fullName(confirm.member)}
                </AlertDialogTitle>
                <AlertDialogDescription>{CONFIRM[confirm.type].description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirm(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={runConfirm}
                  disabled={busy}
                  className={CONFIRM[confirm.type].destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                >
                  {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  {CONFIRM[confirm.type].action}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <InviteRiderDialog open={showInvite} onOpenChange={setInviteOpen} />
      <BatchInviteDialog open={showBatch} onOpenChange={setShowBatch} />
    </div>
  );
}

export default function RidersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RidersContent />
    </Suspense>
  );
}
