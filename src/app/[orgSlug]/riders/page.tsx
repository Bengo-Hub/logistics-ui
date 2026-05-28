"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  CheckCircle,
  Loader2,
  MoreHorizontal,
  Search,
  Truck,
  UserPlus,
  Users,
  XCircle,
  UserX,
  Eye,
  Trash2,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useFleetMembers,
  useApproveMember,
  useSuspendMember,
  useRejectMember,
  useDeleteMember,
  useBatchInviteMembers,
  useInviteMember,
} from "@/hooks/use-fleet";
import type { FleetMember, FleetMemberStatus } from "@/types/logistics";
import { toast } from "sonner";
import { orgRoute } from "@/lib/utils";
import Link from "next/link";

const statusColor: Record<FleetMemberStatus, "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  pending: "warning",
  suspended: "destructive",
  rejected: "secondary",
};

const STATUS_TABS: Array<{ value: FleetMemberStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

type ConfirmAction = {
  type: "approve" | "suspend" | "reject" | "delete";
  member: FleetMember;
};

const EMPTY_ROW = { first_name: "", last_name: "", email: "", phone: "" };

function RidersContent() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilter = (searchParams.get("status") as FleetMemberStatus | "all") || "all";
  const page = Number(searchParams.get("page") ?? 1);
  const search = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(search);

  const [selectedMember, setSelectedMember] = useState<FleetMember | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchRows, setBatchRows] = useState([{ ...EMPTY_ROW }]);
  const [inviteForm, setInviteForm] = useState({ first_name: "", last_name: "", email: "", phone: "", role: "rider" });

  const { data, isLoading, error } = useFleetMembers({
    status: activeFilter !== "all" ? activeFilter : undefined,
    search: search || undefined,
    page,
    limit: 20,
  });

  const approveMutation = useApproveMember();
  const suspendMutation = useSuspendMember();
  const rejectMutation = useRejectMember();
  const deleteMutation = useDeleteMember();
  const batchInvite = useBatchInviteMembers();
  const inviteMember = useInviteMember();

  const members = data?.data ?? [];
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

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, member } = confirmAction;

    const handlers = {
      approve: () =>
        approveMutation.mutate(member.id, {
          onSuccess: () => { toast.success("Rider approved"); setConfirmAction(null); },
          onError: () => toast.error("Failed to approve rider"),
        }),
      suspend: () =>
        suspendMutation.mutate(member.id, {
          onSuccess: () => { toast.success("Rider suspended"); setConfirmAction(null); },
          onError: () => toast.error("Failed to suspend rider"),
        }),
      reject: () =>
        rejectMutation.mutate({ memberId: member.id }, {
          onSuccess: () => { toast.success("Rider rejected"); setConfirmAction(null); },
          onError: () => toast.error("Failed to reject rider"),
        }),
      delete: () =>
        deleteMutation.mutate(member.id, {
          onSuccess: () => { toast.success("Rider removed"); setConfirmAction(null); setSelectedMember(null); },
          onError: () => toast.error("Failed to remove rider"),
        }),
    };
    handlers[type]();
  };

  const isPending =
    approveMutation.isPending ||
    suspendMutation.isPending ||
    rejectMutation.isPending ||
    deleteMutation.isPending;

  const handleBatchInvite = () => {
    const valid = batchRows.filter((r) => r.email.trim());
    if (!valid.length) return;
    batchInvite.mutate(valid, {
      onSuccess: () => {
        setShowBatch(false);
        setBatchRows([{ ...EMPTY_ROW }]);
        toast.success(`${valid.length} rider(s) invited`);
      },
      onError: () => toast.error("Batch invite failed"),
    });
  };

  const handleInvite = () => {
    inviteMember.mutate(inviteForm, {
      onSuccess: () => {
        setShowInvite(false);
        setInviteForm({ first_name: "", last_name: "", email: "", phone: "", role: "rider" });
        toast.success("Rider invited");
      },
      onError: () => toast.error("Failed to invite rider"),
    });
  };

  const confirmMessages: Record<ConfirmAction["type"], { title: string; description: string; actionLabel: string; variant: "default" | "destructive" }> = {
    approve: { title: "Approve Rider", description: "This rider will be granted access to accept deliveries.", actionLabel: "Approve", variant: "default" },
    suspend: { title: "Suspend Rider", description: "This rider will be temporarily prevented from accepting deliveries.", actionLabel: "Suspend", variant: "destructive" },
    reject: { title: "Reject Rider", description: "This rider's application will be permanently rejected.", actionLabel: "Reject", variant: "destructive" },
    delete: { title: "Remove Rider", description: "This will permanently remove the rider from your fleet. This action cannot be undone.", actionLabel: "Remove", variant: "destructive" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riders</h1>
          <p className="text-muted-foreground">
            {data?.total != null ? `${data.total} riders total` : "Manage your fleet members."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBatch(true)}>
            <Users className="size-4" /> Batch Invite
          </Button>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="size-4" /> Add Rider
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search riders..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </form>
        <div className="flex gap-1.5">
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
          <span className="ml-2 text-muted-foreground">Loading riders...</span>
        </div>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">Failed to load riders.</p>
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rider</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No riders found.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedMember(member)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase shrink-0">
                              {member.first_name?.[0] ?? "?"}
                            </div>
                            <div>
                              <p className="font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground">{member.phone || "—"}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs capitalize">{member.role || "rider"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusColor[member.status]} className="text-xs capitalize">
                            {member.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(member.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {member.status === "pending" && (
                              <>
                                <button
                                  onClick={() => setConfirmAction({ type: "approve", member })}
                                  className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle className="size-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ type: "reject", member })}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="size-4" />
                                </button>
                              </>
                            )}
                            {member.status === "active" && (
                              <button
                                onClick={() => setConfirmAction({ type: "suspend", member })}
                                className="p-1.5 rounded-lg hover:bg-warning/10 text-warning transition-colors"
                                title="Suspend"
                              >
                                <UserX className="size-4" />
                              </button>
                            )}
                            {member.status === "suspended" && (
                              <button
                                onClick={() => setConfirmAction({ type: "approve", member })}
                                className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors"
                                title="Reinstate"
                              >
                                <CheckCircle className="size-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                              title="View details"
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              const p2 = new URLSearchParams(searchParams.toString());
              p2.set("page", String(p));
              router.push(`${pathname}?${p2.toString()}`);
            }}
            className="mt-4"
          />
        </>
      )}

      {/* Rider Detail Drawer */}
      <Sheet open={!!selectedMember} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <SheetContent side="right">
          {selectedMember && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary uppercase">
                    {selectedMember.first_name?.[0] ?? "?"}
                  </div>
                  <div>
                    <SheetTitle>{selectedMember.first_name} {selectedMember.last_name}</SheetTitle>
                    <SheetDescription>{selectedMember.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                <Tabs defaultValue="profile">
                  <TabsList className="w-full">
                    <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                    <TabsTrigger value="vehicle" className="flex-1">Vehicle</TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={statusColor[selectedMember.status]} className="mt-1 capitalize">
                          {selectedMember.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <p className="font-medium capitalize mt-1">{selectedMember.role || "rider"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium mt-1">{selectedMember.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Joined</p>
                        <p className="font-medium mt-1">{new Date(selectedMember.created_at).toLocaleDateString()}</p>
                      </div>
                      {selectedMember.emergency_contact_name && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Emergency Contact</p>
                          <p className="font-medium mt-1">
                            {selectedMember.emergency_contact_name} · {selectedMember.emergency_contact_phone}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border space-y-2">
                      {selectedMember.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfirmAction({ type: "approve", member: selectedMember })}
                          >
                            <CheckCircle className="size-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => setConfirmAction({ type: "reject", member: selectedMember })}
                          >
                            <XCircle className="size-4" /> Reject
                          </Button>
                        </div>
                      )}
                      {selectedMember.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setConfirmAction({ type: "suspend", member: selectedMember })}
                        >
                          <UserX className="size-4" /> Suspend Rider
                        </Button>
                      )}
                      <Link href={orgRoute(orgSlug, `/riders/${selectedMember.id}`)}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="size-4" /> Full Profile
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => setConfirmAction({ type: "delete", member: selectedMember })}
                      >
                        <Trash2 className="size-4" /> Remove from Fleet
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="vehicle">
                    {selectedMember.edges?.vehicles && selectedMember.edges.vehicles.length > 0 ? (
                      <div className="space-y-3">
                        {selectedMember.edges.vehicles.map((v) => (
                          <div key={v.id} className="rounded-xl border border-border p-3 text-sm space-y-2">
                            <div className="flex items-center gap-2">
                              <Truck className="size-4 text-primary" />
                              <span className="font-medium">{v.make} {v.model} ({v.year})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <span>Plate: {v.registration_number}</span>
                              <span>Type: {v.vehicle_type}</span>
                              <span>Capacity: {v.capacity_kg}kg</span>
                              <span className="capitalize">Status: {v.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <Truck className="mx-auto size-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No vehicle assigned yet.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="activity">
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">Activity history coming soon.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          {confirmAction && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmMessages[confirmAction.type].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{confirmAction.member.first_name} {confirmAction.member.last_name}</strong>
                  {" — "}
                  {confirmMessages[confirmAction.type].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmAction(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  disabled={isPending}
                  className={confirmMessages[confirmAction.type].variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : undefined}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                  {confirmMessages[confirmAction.type].actionLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Rider Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Rider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input className="mt-1" value={inviteForm.first_name} onChange={(e) => setInviteForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="Jane" />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input className="mt-1" value={inviteForm.last_name} onChange={(e) => setInviteForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input className="mt-1" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input className="mt-1" value={inviteForm.phone} onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+254 700 000 000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteForm.email || inviteMember.isPending}>
              {inviteMember.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Invite Dialog */}
      <Dialog open={showBatch} onOpenChange={setShowBatch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Invite Riders</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {batchRows.map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <Input placeholder="First name" value={row.first_name} onChange={(e) => setBatchRows((r) => r.map((x, idx) => idx === i ? { ...x, first_name: e.target.value } : x))} />
                <Input placeholder="Last name" value={row.last_name} onChange={(e) => setBatchRows((r) => r.map((x, idx) => idx === i ? { ...x, last_name: e.target.value } : x))} />
                <Input placeholder="Email *" type="email" value={row.email} onChange={(e) => setBatchRows((r) => r.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))} />
                <Input placeholder="Phone" value={row.phone} onChange={(e) => setBatchRows((r) => r.map((x, idx) => idx === i ? { ...x, phone: e.target.value } : x))} />
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setBatchRows((r) => [...r, { ...EMPTY_ROW }])}>
            + Add Row
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBatch(false); setBatchRows([{ ...EMPTY_ROW }]); }}>Cancel</Button>
            <Button onClick={handleBatchInvite} disabled={batchInvite.isPending}>
              {batchInvite.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Send Invites
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RidersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <RidersContent />
    </Suspense>
  );
}
