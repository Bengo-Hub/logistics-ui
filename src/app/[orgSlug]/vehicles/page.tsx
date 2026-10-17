"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bike,
  Car,
  Loader2,
  Plus,
  Trash2,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
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
import { VEHICLE_TYPES } from "@/lib/vehicle-types";
import type { CreateVehicleRequest, VehicleType, VehicleStatus } from "@/types/logistics";

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

// ─── Create Vehicle Dialog ────────────────────────────────────────────────────

function CreateVehiclePanel({ onClose }: { onClose: () => void }) {
  const { mutateAsync: createVehicle, isPending } = useCreateVehicle();

  const [form, setForm] = useState<Partial<CreateVehicleRequest>>({
    vehicle_type: "motorcycle",
  });

  function set<K extends keyof CreateVehicleRequest>(k: K, v: CreateVehicleRequest[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.license_plate || !form.make || !form.model || !form.vehicle_type) {
      toast.error("Fill in all required fields.");
      return;
    }
    try {
      await createVehicle(form as CreateVehicleRequest);
      toast.success("Vehicle added successfully.");
      onClose();
    } catch (err) {
      toast.error(apiErrorText(err, "Failed to add vehicle."));
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Add New Vehicle</CardTitle>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">License Plate *</label>
            <Input
              placeholder="KCA 123A"
              value={form.license_plate ?? ""}
              onChange={(e) => set("license_plate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Vehicle Type *</label>
            <select
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.vehicle_type}
              onChange={(e) => set("vehicle_type", e.target.value as VehicleType)}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Make *</label>
            <Input
              placeholder="Honda"
              value={form.make ?? ""}
              onChange={(e) => set("make", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Model *</label>
            <Input
              placeholder="CB125F"
              value={form.model ?? ""}
              onChange={(e) => set("model", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 flex gap-2 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isPending ? "Adding…" : "Add Vehicle"}
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

// ─── Assign Rider Panel ───────────────────────────────────────────────────────

function AssignRiderPanel({
  vehicleId,
  onClose,
}: {
  vehicleId: string;
  onClose: () => void;
}) {
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
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
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
          <option value="">Select rider…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {`${m.first_name} ${m.last_name}`.trim() || `Rider ${m.id.slice(0, 6)}`}
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

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "inactive"];

function VehicleCard({ vehicle }: { vehicle: FleetVehicle }) {
  const [showAssign, setShowAssign] = useState(false);
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const unlink = useAssignVehicle();
  const assignee = vehicle.assigned_to;
  const isAssigned = !!assignee;

  function handleStatusChange(status: VehicleStatus) {
    updateVehicle.mutate(
      { vehicleId: vehicle.id, status },
      {
        onError: () => toast.error("Failed to update vehicle status."),
      }
    );
  }

  function handleDelete() {
    if (isAssigned) {
      toast.error("Unassign this vehicle from its rider before deleting it.");
      return;
    }
    if (!confirm(`Delete vehicle ${vehicle.license_plate}? This cannot be undone.`)) return;
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => toast.success("Vehicle deleted."),
      onError: (err: any) =>
        toast.error(err?.response?.data ?? "Failed to delete vehicle."),
    });
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
            <VehicleIcon type={vehicle.vehicle_type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold font-mono">
                {vehicle.license_plate}
              </p>
              {statusBadge(vehicle.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vehicle.make} {vehicle.model}
            </p>
            {assignee && (
              <p className="text-xs text-primary mt-1 font-medium">
                Assigned: {assignee.name || `Rider ${assignee.member_id.slice(0, 6)}`}
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
              </p>
            )}
            {!assignee && !showAssign && (
              <button
                className="mt-1.5 text-xs text-muted-foreground underline hover:text-primary"
                onClick={() => setShowAssign(true)}
              >
                Assign to rider
              </button>
            )}
            {showAssign && (
              <AssignRiderPanel
                vehicleId={vehicle.id}
                onClose={() => setShowAssign(false)}
              />
            )}
            <div className="mt-2 flex items-center gap-2">
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
          </div>
          <Badge variant="outline" className="text-xs shrink-0 capitalize">
            {vehicle.vehicle_type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // The API lists every vehicle, rider or not, with the rider it is linked to, and counts the
  // whole fleet in SQL, so the page and the totals stay right however large the fleet grows.
  const { data, isLoading } = useFleetVehicles({ search: search.trim() || undefined, page, limit: PAGE_SIZE });
  const vehicles = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const statusCounts = data?.summary ?? { active: 0, maintenance: 0, inactive: 0, assigned: 0, unassigned: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">Manage fleet vehicles and rider assignments.</p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="size-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active", value: statusCounts.active, color: "text-success", bg: "bg-success/10" },
          { label: "In Maintenance", value: statusCounts.maintenance, color: "text-warning", bg: "bg-warning/10" },
          { label: "Inactive", value: statusCounts.inactive, color: "text-muted-foreground", bg: "bg-muted" },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <Car className={`size-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate && <CreateVehiclePanel onClose={() => setShowCreate(false)} />}

      {/* Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search by plate, make, model…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Vehicle Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Car className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No vehicles found.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add a vehicle to get started, then link it to a rider.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-3.5" />
            Add First Vehicle
          </Button>
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
