"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { useDeliveryPolicy, useSaveDeliveryPolicy } from "@/hooks/use-zones";
import type { DeliveryPolicy } from "@/types/logistics";
import { money } from "./zone-utils";

const label = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const selectCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

/** Per-km fallback pricing and geofence settings (logistics.delivery_quote_policy). */
export function DeliveryPricingCard({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useDeliveryPolicy();
  const save = useSaveDeliveryPolicy();
  const [p, setP] = useState<DeliveryPolicy | null>(null);

  useEffect(() => {
    if (data?.policy) setP(data.policy);
  }, [data]);

  if (isLoading || !p) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pricing...
        </CardContent>
      </Card>
    );
  }

  const num = (k: keyof DeliveryPolicy) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setP({ ...p, [k]: e.target.value === "" ? 0 : Number(e.target.value) } as DeliveryPolicy);

  // Worked example so admins can sanity-check the numbers before saving.
  const example = (km: number) => {
    let fee = Math.max(p.base_fee + p.per_km_rate * km, p.min_fee);
    if (p.rounding > 0) fee = Math.ceil(fee / p.rounding - 1e-9) * p.rounding;
    return fee;
  };

  const onSave = async () => {
    try {
      await save.mutateAsync(p);
      toast.success("Delivery pricing saved");
    } catch (e) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not save pricing");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Distance pricing and geofence</CardTitle>
            <CardDescription>
              Applies to customer pins outside every delivery area. Areas with their own fee always win.
            </CardDescription>
          </div>
          <Badge variant={data?.source === "tenant" ? "success" : "secondary"}>
            {data?.source === "tenant" ? "Custom" : data?.source === "platform" ? "Platform default" : "Default"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className={label}>Outside the areas</p>
            <select className={selectCls} value={p.fallback} onChange={(e) => setP({ ...p, fallback: e.target.value as DeliveryPolicy["fallback"] })}>
              <option value="per_km">Charge by distance near the areas</option>
              <option value="none">Only deliver inside the areas</option>
            </select>
          </div>
          <div className="space-y-1">
            <p className={label}>Accept pins within (km of an area)</p>
            <Input type="number" min={0} step={0.5} value={p.buffer_km} onChange={num("buffer_km")} disabled={p.fallback === "none"} />
          </div>
          <div className="space-y-1">
            <p className={label}>Maximum distance from outlet (km)</p>
            <Input
              type="number"
              min={0}
              placeholder="No limit"
              value={p.max_radius_km ?? ""}
              onChange={(e) => setP({ ...p, max_radius_km: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className={label}>Rate per km</p>
            <Input type="number" min={0} value={p.per_km_rate} onChange={num("per_km_rate")} />
          </div>
          <div className="space-y-1">
            <p className={label}>Base fee</p>
            <Input type="number" min={0} value={p.base_fee} onChange={num("base_fee")} />
          </div>
          <div className="space-y-1">
            <p className={label}>Minimum fee</p>
            <Input type="number" min={0} value={p.min_fee} onChange={num("min_fee")} />
          </div>
          <div className="space-y-1">
            <p className={label}>Round up to</p>
            <Input type="number" min={0} value={p.rounding} onChange={num("rounding")} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className={label}>Distance</p>
            <select className={selectCls} value={p.distance_source} onChange={(e) => setP({ ...p, distance_source: e.target.value as DeliveryPolicy["distance_source"] })}>
              <option value="road">Road distance</option>
              <option value="straight">Straight line</option>
            </select>
          </div>
          <div className="space-y-1">
            <p className={label}>Road factor if routing is down</p>
            <Input type="number" min={1} step={0.05} value={p.road_factor_fallback} onChange={num("road_factor_fallback")} />
          </div>
          <div className="space-y-1">
            <p className={label}>Rider speed (km/h)</p>
            <Input type="number" min={1} value={p.speed_kmh} onChange={num("speed_kmh")} />
          </div>
          <div className="space-y-1">
            <p className={label}>Preparation (min)</p>
            <Input type="number" min={0} value={p.prep_minutes} onChange={num("prep_minutes")} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className={label}>Currency</p>
            <Input value={p.currency} maxLength={3} onChange={(e) => setP({ ...p, currency: e.target.value.toUpperCase() })} />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.require_zones} onChange={(e) => setP({ ...p, require_zones: e.target.checked })} />
            Refuse deliveries until at least one area exists
          </label>
        </section>

        {p.fallback === "per_km" && (
          <div className="rounded-xl bg-muted/50 p-4 text-sm">
            <p className="font-medium">How a distance quote works</p>
            <p className="text-muted-foreground">
              {money(p.base_fee, p.currency)} + {money(p.per_km_rate, p.currency)} per km, at least {money(p.min_fee, p.currency)}
              {p.rounding > 0 ? `, rounded up to the next ${p.rounding}` : ""}. For example 3 km costs {money(example(3), p.currency)}, 7.4 km
              costs {money(example(7.4), p.currency)} and 12 km costs {money(example(12), p.currency)}.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={!canManage || save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save pricing
          </Button>
        </div>
        {!canManage && <p className="text-right text-xs text-muted-foreground">You need the pricing permission to change these settings.</p>}
      </CardContent>
    </Card>
  );
}
