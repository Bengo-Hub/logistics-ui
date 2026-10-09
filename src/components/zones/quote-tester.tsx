"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { LatLng, ZoneShape } from "@bengo-hub/maps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { useDeliveryQuote, useReversePlace } from "@/hooks/use-zones";
import type { DeliveryCoverage } from "@/types/logistics";
import { REASON_LABEL, money } from "./zone-utils";

const PointPickerMap = dynamic(() => import("./zone-maps").then((m) => m.PointPickerMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />,
});

/** Tap the map or type coordinates to see exactly what a customer would be quoted. */
export function QuoteTester({ coverage, authToken }: { coverage?: DeliveryCoverage; authToken?: string }) {
  const [point, setPoint] = useState<LatLng | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [outletId, setOutletId] = useState("");
  const [orderTotal, setOrderTotal] = useState("");

  const q = point ? { lat: point.latitude, lng: point.longitude } : null;
  const quote = useDeliveryQuote(q, outletId, Number(orderTotal) || undefined);
  const place = useReversePlace(q);

  const zones = useMemo<ZoneShape[]>(
    () => (coverage?.zones ?? []).map((z) => ({ id: z.id, name: z.name, boundary: z.boundary, color: z.color, zoneType: z.zone_type })),
    [coverage],
  );
  const center = coverage?.center ? { latitude: coverage.center.lat, longitude: coverage.center.lng } : undefined;

  const pick = (p: LatLng) => {
    setPoint(p);
    setLat(p.latitude.toFixed(6));
    setLng(p.longitude.toFixed(6));
  };
  const typed = () => {
    const la = Number(lat), lo = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(lo) && lat && lng) setPoint({ latitude: la, longitude: lo });
  };
  const r = quote.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test a location</CardTitle>
        <CardDescription>Tap the map or type coordinates. This is the same quote customers get at checkout.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="relative h-105 overflow-hidden rounded-xl border">
          <PointPickerMap className="absolute inset-0" value={point} onChange={pick} zones={zones} defaultCenter={center} authToken={authToken} />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Input inputMode="decimal" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} onBlur={typed} />
            <Input inputMode="decimal" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} onBlur={typed} />
          </div>
          {(coverage?.outlets?.length ?? 0) > 1 && (
            <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <option value="">Nearest outlet</option>
              {coverage!.outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <Input type="number" placeholder="Basket total (optional)" value={orderTotal} onChange={(e) => setOrderTotal(e.target.value)} />

          {!point && <p className="text-sm text-muted-foreground">Pick a point to see the quote.</p>}
          {point && quote.isFetching && !r && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Quoting...
            </p>
          )}
          {point && r && (
            <div className="space-y-2 rounded-xl border p-4 text-sm">
              <p className="flex items-center gap-2 text-base font-semibold">
                {r.serviceable ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                {r.serviceable ? (r.free ? "Free delivery" : money(r.fee, r.currency)) : REASON_LABEL[r.reason ?? ""] ?? "Not deliverable"}
              </p>
              {place.data?.name && <p className="text-muted-foreground">{place.data.name}</p>}
              {r.zone && <Row k="Area" v={r.zone.name} />}
              {r.method && <Row k="Priced by" v={r.method === "zone" ? "Area fee" : "Distance rate"} />}
              {!r.zone && r.nearest_area && <Row k="Nearest area" v={`${r.nearest_area.name} (${r.nearest_area_km} km away)`} />}
              {r.outlet && <Row k="From outlet" v={r.outlet.name} />}
              {r.distance_km > 0 && <Row k="Distance" v={`${r.distance_km} km (${r.distance_type ?? "estimated"})`} />}
              {r.eta_minutes ? <Row k="ETA" v={`${r.eta_minutes} min`} /> : null}
              {r.min_order > 0 && <Row k="Minimum order" v={money(r.min_order, r.currency)} />}
              {r.below_min_order && <p className="text-amber-600">The basket is below this area&apos;s minimum order.</p>}
              {r.breakdown && (
                <p className="text-xs text-muted-foreground">
                  {money(r.breakdown.base_fee, r.currency)} + {r.breakdown.per_km_rate}/km = {money(r.breakdown.raw, r.currency)}, min{" "}
                  {money(r.breakdown.min_fee, r.currency)}, rounded to {r.breakdown.rounding}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </p>
  );
}
