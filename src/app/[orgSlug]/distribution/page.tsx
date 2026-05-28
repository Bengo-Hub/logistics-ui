"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Shield,
  Thermometer,
  Truck,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/base";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ModuleGate } from "@/components/ui/module-gate";
import {
  useShipments,
  useCreateShipment,
  useDispatchShipment,
  useCustodyEvents,
} from "@/hooks/use-shipments";
import type { CreateShipmentRequest, Shipment, ShipmentStatus } from "@/types/logistics";
import { toast } from "sonner";

const STATUS_TABS: Array<{ value: ShipmentStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "in_transit", label: "In Transit" },
  { value: "partially_delivered", label: "Partial" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; icon: typeof Clock }> = {
  planned: { label: "Planned", variant: "outline", icon: Clock },
  in_transit: { label: "In Transit", variant: "secondary", icon: Truck },
  partially_delivered: { label: "Partial", variant: "warning", icon: PackageCheck },
  completed: { label: "Completed", variant: "success", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertTriangle },
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" });
}

// ─── Custody Timeline ─────────────────────────────────────────────────────────

function CustodyTimeline({ shipmentId }: { shipmentId: string }) {
  const { data, isLoading } = useCustodyEvents(shipmentId);
  const events = data?.data ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading custody events...</p>;
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No custody events yet.</p>;

  return (
    <ol className="relative border-l border-border ml-2">
      {events.map((ev) => (
        <li key={ev.id} className="mb-4 ml-4">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
          <p className="text-xs text-muted-foreground">{formatDate(ev.occurred_at)}</p>
          <p className="font-medium text-sm capitalize">{ev.event_type.replace(/_/g, " ")}</p>
          <p className="text-sm text-muted-foreground">{ev.actor_name}</p>
          {ev.location_name && <p className="text-xs text-muted-foreground">{ev.location_name}</p>}
          {ev.temperature_reading != null && (
            <p className="text-xs flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              {ev.temperature_reading}°C
            </p>
          )}
          {ev.notes && <p className="text-xs italic mt-0.5">{ev.notes}</p>}
        </li>
      ))}
    </ol>
  );
}

// ─── Shipment Detail Sheet ────────────────────────────────────────────────────

function ShipmentDetailSheet({
  shipment,
  onClose,
}: {
  shipment: Shipment | null;
  onClose: () => void;
}) {
  const dispatch = useDispatchShipment();

  if (!shipment) return null;
  const s = shipment;
  const cfg = statusConfig[s.status] ?? statusConfig.planned;
  const StatusIcon = cfg.icon;

  function handleDispatch() {
    dispatch.mutate(s.id, {
      onSuccess: () => { toast.success("Shipment dispatched"); onClose(); },
      onError: () => toast.error("Failed to dispatch"),
    });
  }

  return (
    <Sheet open={!!shipment} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {shipment.shipment_code}
          </SheetTitle>
          <SheetDescription>
            <Badge variant={cfg.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" /> {cfg.label}
            </Badge>
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">From</p>
              <p className="font-medium">{shipment.source_facility_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">To</p>
              <p className="font-medium">{shipment.dest_facility_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Type</p>
              <p className="capitalize">{shipment.shipment_type?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Planned Dispatch</p>
              <p>{formatDate(shipment.planned_dispatch_at)}</p>
            </div>
            {shipment.seal_number && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Seal Number</p>
                <p className="font-mono">{shipment.seal_number}</p>
              </div>
            )}
            {(shipment.temperature_min_celsius != null || shipment.temperature_max_celsius != null) && (
              <div className="col-span-2 flex items-center gap-2 text-sm">
                <Thermometer className="h-4 w-4 text-blue-500" />
                Cold chain: {shipment.temperature_min_celsius}°C – {shipment.temperature_max_celsius}°C
              </div>
            )}
          </div>

          {shipment.status === "planned" && (
            <Button
              size="sm"
              onClick={handleDispatch}
              disabled={dispatch.isPending}
              className="w-full"
            >
              <Truck className="h-4 w-4 mr-2" />
              {dispatch.isPending ? "Dispatching..." : "Dispatch Shipment"}
            </Button>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              <Shield className="h-4 w-4" /> Chain of Custody
            </h4>
            <CustodyTimeline shipmentId={shipment.id} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// ─── Create Shipment Dialog ────────────────────────────────────────────────────

function CreateShipmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<Partial<CreateShipmentRequest>>({
    shipment_type: "warehouse_transfer",
    source_facility_name: "",
    dest_facility_name: "",
  });
  const create = useCreateShipment();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.source_facility_name || !form.dest_facility_name) return;
    create.mutate(form as CreateShipmentRequest, {
      onSuccess: () => { toast.success("Shipment created"); onClose(); },
      onError: () => toast.error("Failed to create shipment"),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Type</label>
            <select
              className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={form.shipment_type}
              onChange={(e) => setForm((f) => ({ ...f, shipment_type: e.target.value as CreateShipmentRequest["shipment_type"] }))}
            >
              <option value="warehouse_transfer">Warehouse Transfer</option>
              <option value="hospital_delivery">Hospital Delivery</option>
              <option value="recall">Recall</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">From Facility</label>
            <Input
              className="mt-1"
              placeholder="Source facility name"
              value={form.source_facility_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, source_facility_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">To Facility</label>
            <Input
              className="mt-1"
              placeholder="Destination facility name"
              value={form.dest_facility_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, dest_facility_name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Min Temp (°C)</label>
              <Input
                className="mt-1"
                type="number"
                placeholder="e.g. 2"
                onChange={(e) => setForm((f) => ({ ...f, temperature_min_celsius: Number(e.target.value) || undefined }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Temp (°C)</label>
              <Input
                className="mt-1"
                type="number"
                placeholder="e.g. 8"
                onChange={(e) => setForm((f) => ({ ...f, temperature_max_celsius: Number(e.target.value) || undefined }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Seal Number</label>
            <Input
              className="mt-1"
              placeholder="Physical seal ID (optional)"
              onChange={(e) => setForm((f) => ({ ...f, seal_number: e.target.value || undefined }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">External Reference</label>
            <Input
              className="mt-1"
              placeholder="e.g. transfer ID (optional)"
              onChange={(e) => setForm((f) => ({ ...f, external_reference: e.target.value || undefined }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Shipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function DistributionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = (searchParams.get("status") ?? "all") as ShipmentStatus | "all";

  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useShipments(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const shipments = data?.data ?? [];

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
          <h1 className="text-2xl font-bold tracking-tight">Distribution</h1>
          <p className="text-muted-foreground text-sm">Manage shipments and chain of custody</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Shipment
          </Button>
        </div>
      </div>

      {/* Status tabs */}
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

      {/* Shipments list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : shipments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No shipments found</p>
            <p className="text-sm">Create a shipment to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shipments.map((s) => {
            const cfg = statusConfig[s.status] ?? statusConfig.planned;
            const StatusIcon = cfg.icon;
            return (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedShipment(s)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{s.shipment_code}</span>
                      <Badge variant={cfg.variant} className="gap-1 text-xs">
                        <StatusIcon className="h-3 w-3" /> {cfg.label}
                      </Badge>
                      {s.seal_number && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" /> {s.seal_number}
                        </Badge>
                      )}
                      {s.temperature_min_celsius != null && (
                        <Badge variant="outline" className="text-xs">
                          <Thermometer className="h-3 w-3 mr-1" />
                          {s.temperature_min_celsius}–{s.temperature_max_celsius}°C
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {s.source_facility_name} → {s.dest_facility_name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {s.shipment_type?.replace(/_/g, " ")} · {formatDate(s.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ShipmentDetailSheet
        shipment={selectedShipment}
        onClose={() => setSelectedShipment(null)}
      />
      <CreateShipmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

export default function DistributionPage() {
  return (
    <ModuleGate
      moduleKey="distribution"
      fallback={
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Package className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Distribution module not enabled</p>
          <p className="text-sm">Contact your administrator to enable this feature.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>}>
        <DistributionContent />
      </Suspense>
    </ModuleGate>
  );
}
