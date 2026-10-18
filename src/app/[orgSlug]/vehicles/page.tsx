"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bike,
  Car,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
import { PermissionGate } from "@/components/ui/module-gate";
import { InsuranceBadge } from "@/components/vehicles/insurance-badge";
import { RenewInsuranceDialog } from "@/components/vehicles/renew-insurance-dialog";
import { EMPTY_VEHICLE, VehicleForm, vehicleMissing, vehicleRequest, type VehicleDraft } from "@/components/vehicles/vehicle-form";
import {
  useFleetMembers,
  useFleetVehicles,
  useCreateVehicle,
  useAssignVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from "@/hooks/use-fleet";
import type { FleetVehicle } from "@/lib/api/logistics";
import { apiErrorText } from "@/lib/utils";
import type { VehicleType, VehicleStatus } from "@/types/logistics";

const PAGE_SIZE = 30;

function VehicleIcon({ type }: { type: VehicleType }) {
  if (type === "motorcycle" || type === "bicycle") return <Bike className="size-4 text-primary" />;
  if (type === "truck" || type === "van") return <Truck className="size-4 text-primary" />;
  return <Car className="size-4 text-primary" />;
}

function statusBadge(status: VehicleStatus) {
  const map: Record<VehicleStatus, string> = {
    active: "bg-success/15 text-success",
    inactive: "bg-muted text-muted-foreground",
    maintenance: "bg-warning/15 text-warning",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {status === "maintenance" && <Wrench className="size-3" />}
      {status === "inactive" && <AlertTriangle className="size-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/** Make and model without the "Unknown" placeholder the API stores for blanks. */
function makeModel(v: FleetVehicle) {
  return [v.make, v.model].filter((p) => p && p !== "Unknown").join(" ");
}

// ─── Add vehicle ──────────────────────────────────────────────────────────────

function CreateVehiclePanel({ onClose }: { onClose: () => void }) {
  const { mutateAsync: createVehicle, isPending } = useCreateVehicle();
  const [draft, setDraft] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const missing = vehicleMissing(draft);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missing) {
      toast.error(`Add the ${missing}.`);
      return;
    }
    try {
      await createVehicle(vehicleRequest(draft));
      toast.success("Vehicle added. Link it to a rider from its card or the rider's sheet.");
      onClose();
    } catch (err) {
      toast.error(apiErrorText(err, "Failed to add vehicle."));
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Add vehicle</CardTitle>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <VehicleForm value={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !!missing} title={missing ? `Add the ${missing}` : undefined}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isPending ? "Adding..." : "Add vehicle"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Assign rider ─────────────────────────────────────────────────────────────

function AssignRiderPanel({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [riderSearch, setRiderSearch] = useState("");
  // Server-side search keeps this fast however many riders the fleet has.
  const { data: membersData } = useFleetMembers({ status: "active", search: riderSearch.trim() || undefined, limit: 20 });
  const { mutateAsync: assignVehicle, isPending } = useAssignVehicle();
  const members = membersData?.data ?? [];

  async function handleAssign() {
    if (!memberId) {
      toast.error("Select a rider.");
      return;
    }
    try {
      await assignVehicle({ memberId, vehicleId });
      toast.success("Vehicle assigned to rider.");
      onClose();
    } catch (err) {
      toast.error(apiErrorText(err, "Failed to assign vehicle."));
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium">Assign to rider</p>
      <Input
        placeholder="Search riders by name, phone or email"
        value={riderSearch}
        onChange={(e) => setRiderSearch(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="flex gap-2">
        <select
          className="flex h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          <option value="">Select rider...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {`${m.first_name} ${m.last_name}`.trim() || `Rider ${m.id.slice(0, 6)}`}
              {m.edges?.vehicles?.length ? ` (has ${m.edges.vehicles[0].license_plate})` : ""}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={handleAssign} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Assign"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Vehicle card ─────────────────────────────────────────────────────────────

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "inactive"];

function VehicleCard({ vehicle }: { vehicle: FleetVehicle }) {
  const [showAssign, setShowAssign] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const unlink = useAssignVehicle();
  const assignee = vehicle.assigned_to;
  const ins = vehicle.insurance;
  // Deactivated by the insurance monitor: renewing reactivates it.
  const offForInsurance = vehicle.metadata?.inactive_reason === "insurance_expired";

  function handleStatusChange(status: VehicleStatus) {
    updateVehicle.mutate({ vehicleId: vehicle.id, status }, { onError: (err) => toast.error(apiErrorText(err, "Failed to update vehicle status.")) });
  }

  function handleDelete() {
    if (assignee) {
      toast.error("Unlink this vehicle from its rider before deleting it.");
      return;
    }
    if (!confirm(`Delete vehicle ${vehicle.license_plate}? This cannot be undone.`)) return;
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => toast.success("Vehicle deleted."),
      onError: (err) => toast.error(apiErrorText(err, "Failed to delete vehicle.")),
    });
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
            <VehicleIcon type={vehicle.vehicle_type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold">{vehicle.license_plate}</p>
              {statusBadge(vehicle.status)}
            </div>
            {makeModel(vehicle) && <p className="mt-0.5 text-xs text-muted-foreground">{makeModel(vehicle)}</p>}
            {vehicle.chassis_no && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">Chassis {vehicle.chassis_no}</p>}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <InsuranceBadge view={ins} />
              {ins?.policy_no && <span className="text-[11px] text-muted-foreground">Policy {ins.policy_no}</span>}
            </div>
            {offForInsurance && (
              <p className="mt-1 text-[11px] text-destructive">Deactivated: insurance expired. Renewing reactivates it.</p>
            )}
            {ins?.block && ins.block !== "vehicle_inactive" && (
              <p className="mt-1 text-[11px] text-destructive">Its rider gets no jobs until the insurance is recorded.</p>
            )}

            {assignee && (
              <p className="mt-1 text-xs font-medium text-primary">
                Assigned: {assignee.name || `Rider ${assignee.member_id.slice(0, 6)}`}
                <PermissionGate permission="logistics.fleet.manage">
                  <button
                    className="ml-2 font-normal text-muted-foreground underline hover:text-destructive"
                    disabled={unlink.isPending}
                    onClick={() =>
                      unlink.mutate(
                        { memberId: assignee.member_id, vehicleId: null },
                        {
                          onSuccess: () => toast.success("Vehicle unlinked."),
                          onError: (err) => toast.error(apiErrorText(err, "Could not unlink the vehicle.")),
                        },
                      )
                    }
                  >
                    Unlink
                  </button>
                </PermissionGate>
              </p>
            )}
            <PermissionGate permission="logistics.fleet.manage">
              {!assignee && !showAssign && (
                <button className="mt-1.5 text-xs text-muted-foreground underline hover:text-primary" onClick={() => setShowAssign(true)}>
                  Assign to rider
                </button>
              )}
              {showAssign && <AssignRiderPanel vehicleId={vehicle.id} onClose={() => setShowAssign(false)} />}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={vehicle.status}
                  disabled={updateVehicle.isPending}
                  onChange={(e) => handleStatusChange(e.target.value as VehicleStatus)}
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs capitalize focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {VEHICLE_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                {ins && ins.status !== "not_required" && (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setShowRenew(true)}>
                    {ins.policy_no ? "Renew insurance" : "Add insurance"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deleteVehicle.isPending}
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </PermissionGate>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs capitalize">
            {vehicle.vehicle_type}
          </Badge>
        </div>
      </CardContent>
      <RenewInsuranceDialog vehicleId={vehicle.id} plate={vehicle.license_plate} current={ins} open={showRenew} onOpenChange={setShowRenew} />
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // The API lists every vehicle, rider or not, with the rider it is linked to and its insurance,
  // and counts the whole fleet in SQL, so the page and the totals stay right however large it grows.
  const { data, isLoading } = useFleetVehicles({ search: search.trim() || undefined, page, limit: PAGE_SIZE });
  const vehicles = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const s = data?.summary;

  const stats = [
    { label: "Active", value: s?.active ?? 0, Icon: Car, color: "text-success", bg: "bg-success/10" },
    { label: "In maintenance", value: s?.maintenance ?? 0, Icon: Wrench, color: "text-warning", bg: "bg-warning/10" },
    { label: "Inactive", value: s?.inactive ?? 0, Icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Insurance expiring", value: s?.insurance_expiring ?? 0, Icon: ShieldAlert, color: "text-warning", bg: "bg-warning/10" },
    { label: "Insurance expired", value: s?.insurance_expired ?? 0, Icon: ShieldOff, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "No insurance recorded", value: s?.insurance_missing ?? 0, Icon: ShieldCheck, color: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">Fleet vehicles, their insurance and which rider has each one.</p>
        </div>
        <PermissionGate permission="logistics.fleet.manage">
          <Button onClick={() => setShowCreate((v) => !v)}>
            <Plus className="size-4" />
            Add vehicle
          </Button>
        </PermissionGate>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((st) => (
          <Card key={st.label} className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${st.bg}`}>
                <st.Icon className={`size-4 ${st.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{st.label}</p>
                <p className="text-lg font-bold">{st.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate && <CreateVehiclePanel onClose={() => setShowCreate(false)} />}

      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Input
            placeholder="Search by plate, make, model..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Car className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No vehicles found.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Add a vehicle with its insurance, then link it to a rider.</p>
          <PermissionGate permission="logistics.fleet.manage">
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="size-3.5" />
              Add first vehicle
            </Button>
          </PermissionGate>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
