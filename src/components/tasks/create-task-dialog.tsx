"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import type { LatLng, ZoneShape } from "@bengo-hub/maps";
import { Button, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateTask } from "@/hooks/use-tasks";
import { useDeliveryCoverage, useDeliveryQuote, usePlaceSearch, useReversePlace } from "@/hooks/use-zones";
import { useAuthStore } from "@/store/auth";
import { REASON_LABEL, money } from "@/components/zones/zone-utils";

const PointPickerMap = dynamic(() => import("@/components/zones/zone-maps").then((m) => m.PointPickerMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />,
});

const fieldCls = "mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

type Form = {
  task_type: string;
  priority: number;
  external_reference: string;
  outlet_id: string;
  pickup_address: string;
  dropoff_address: string;
  customer_name: string;
  customer_phone: string;
  instructions: string;
  cash_on_delivery: string;
};

const EMPTY: Form = {
  task_type: "delivery",
  priority: 1,
  external_reference: "",
  outlet_id: "",
  pickup_address: "",
  dropoff_address: "",
  customer_name: "",
  customer_phone: "",
  instructions: "",
  cash_on_delivery: "",
};

/**
 * A delivery a dispatcher books by hand (phone orders, errands). The pickup comes from an
 * outlet and the drop-off is pinned on the map, so the job gets real stops: the rider can
 * navigate, the drop-off is tagged with its delivery area and auto-assign can find the
 * nearest rider. Addresses are sent as the API's top-level fields, which create the stops.
 */
export function CreateTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const authToken = useAuthStore((s) => s.session?.accessToken ?? undefined);
  const { data: coverage } = useDeliveryCoverage();
  const createTask = useCreateTask();
  const [form, setForm] = useState<Form>(EMPTY);
  const [drop, setDrop] = useState<LatLng | null>(null);
  const [search, setSearch] = useState("");

  const outlets = coverage?.outlets ?? [];
  const outlet = outlets.find((o) => o.id === form.outlet_id);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  // One outlet: preselect it.
  useEffect(() => {
    if (open && !form.outlet_id && outlets.length === 1) set("outlet_id", outlets[0]!.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, outlets.length]);

  const point = drop ? { lat: drop.latitude, lng: drop.longitude } : null;
  const place = useReversePlace(point);
  const quote = useDeliveryQuote(point, form.outlet_id || undefined);
  const results = usePlaceSearch(search);

  // Fill the address from the pin unless the dispatcher already typed one.
  useEffect(() => {
    const name = place.data?.display_name || place.data?.name;
    if (name) setForm((p) => (p.dropoff_address ? p : { ...p, dropoff_address: name }));
  }, [place.data]);

  const zones = useMemo<ZoneShape[]>(
    () => (coverage?.zones ?? []).map((z) => ({ id: z.id, name: z.name, boundary: z.boundary, color: z.color, zoneType: z.zone_type })),
    [coverage],
  );
  const center = outlet
    ? { latitude: outlet.location.lat, longitude: outlet.location.lng }
    : coverage?.center
      ? { latitude: coverage.center.lat, longitude: coverage.center.lng }
      : undefined;

  const pickupAddress = outlet ? outlet.name : form.pickup_address.trim();
  const canSave = !!pickupAddress && (!!drop || !!form.dropoff_address.trim()) && !createTask.isPending;

  const reset = () => {
    setForm(EMPTY);
    setDrop(null);
    setSearch("");
  };

  const save = () => {
    const cod = Number(form.cash_on_delivery);
    const metadata: Record<string, unknown> = {};
    if (outlet) metadata.outlet_id = outlet.id;
    if (cod > 0) metadata.cash_on_delivery = cod;
    createTask.mutate(
      {
        task_type: form.task_type,
        priority: form.priority,
        source_service: "logistics",
        ...(form.external_reference.trim() ? { external_reference: form.external_reference.trim() } : {}),
        pickup_address: pickupAddress,
        ...(outlet ? { pickup_lat: outlet.location.lat, pickup_lng: outlet.location.lng } : {}),
        dropoff_address: form.dropoff_address.trim() || place.data?.name || "Pinned location",
        ...(drop ? { dropoff_lat: drop.latitude, dropoff_lng: drop.longitude } : {}),
        ...(form.customer_name.trim() ? { customer_name: form.customer_name.trim() } : {}),
        ...(form.customer_phone.trim() ? { customer_phone: form.customer_phone.trim() } : {}),
        ...(form.instructions.trim() ? { instructions: form.instructions.trim() } : {}),
        ...(Object.keys(metadata).length ? { metadata } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Delivery created");
          reset();
          onOpenChange(false);
        },
        onError: () => toast.error("Could not create the delivery"),
      },
    );
  };

  const q = quote.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New delivery</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Type
                <select className={fieldCls} value={form.task_type} onChange={(e) => set("task_type", e.target.value)}>
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pickup</option>
                  <option value="outlet_transfer">Outlet transfer</option>
                  <option value="returns">Return</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Priority
                <select className={fieldCls} value={form.priority} onChange={(e) => set("priority", Number(e.target.value))}>
                  <option value={1}>Normal</option>
                  <option value={2}>High</option>
                  <option value={3}>Urgent</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium">
              Pick up from
              {outlets.length > 0 ? (
                <select className={fieldCls} value={form.outlet_id} onChange={(e) => set("outlet_id", e.target.value)}>
                  <option value="">Another address...</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </label>
            {!outlet && (
              <Input
                value={form.pickup_address}
                onChange={(e) => set("pickup_address", e.target.value)}
                placeholder="Pickup address"
              />
            )}

            <label className="block text-sm font-medium">
              Deliver to
              <Input
                className="mt-1"
                value={form.dropoff_address}
                onChange={(e) => set("dropoff_address", e.target.value)}
                placeholder="Address or landmark (pin it on the map)"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Customer name
                <Input className="mt-1" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Customer phone
                <Input
                  className="mt-1"
                  inputMode="tel"
                  value={form.customer_phone}
                  onChange={(e) => set("customer_phone", e.target.value)}
                  placeholder="07..."
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Instructions for the rider
              <Input
                className="mt-1"
                value={form.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                placeholder="Gate, floor, call on arrival..."
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Rider collects (KES)
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={form.cash_on_delivery}
                  onChange={(e) => set("cash_on_delivery", e.target.value)}
                  placeholder="0 if prepaid"
                />
              </label>
              <label className="text-sm font-medium">
                Reference
                <Input
                  className="mt-1"
                  value={form.external_reference}
                  onChange={(e) => set("external_reference", e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a place to pin" />
              {search.trim().length >= 3 && (results.data?.length ?? 0) > 0 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {results.data!.map((p, i) => (
                    <button
                      key={`${p.location.lat},${p.location.lng},${i}`}
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setDrop({ latitude: p.location.lat, longitude: p.location.lng });
                        set("dropoff_address", p.display_name || p.name);
                        setSearch("");
                      }}
                    >
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{p.display_name || p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative h-72 overflow-hidden rounded-xl border md:h-80">
              <PointPickerMap
                className="absolute inset-0"
                value={drop}
                onChange={setDrop}
                zones={zones}
                defaultCenter={center}
                authToken={authToken}
              />
            </div>
            {!drop ? (
              <p className="text-xs text-muted-foreground">Tap the map to pin the drop-off. A pin lets riders navigate and tags the delivery area.</p>
            ) : quote.isFetching && !q ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Checking the area...
              </p>
            ) : q ? (
              <p className="text-xs">
                {q.serviceable ? (
                  <>
                    <span className="font-medium">{q.zone?.name ?? "Outside named areas"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · customer fee {q.free ? "free" : money(q.fee, q.currency)}
                      {q.distance_km > 0 ? ` · ${q.distance_km} km` : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-warning">{REASON_LABEL[q.reason ?? ""] ?? "Outside your delivery areas"}. You can still send it.</span>
                )}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {createTask.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Create delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
