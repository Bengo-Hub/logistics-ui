"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2, MapPin, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import type { LatLng, ZoneShape } from "@bengo-hub/maps";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSaveOutletPin, useTenantOutlets } from "@/hooks/use-tenant-outlets";
import { useAuthStore } from "@/store/auth";
import type { DeliveryCoverage, TenantOutlet } from "@/types/logistics";
import { pointFromMapLink } from "./zone-utils";

const PointPickerMap = dynamic(() => import("./zone-maps").then((m) => m.PointPickerMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />,
});

const ADMIN_ROLES = ["admin", "superuser", "owner", "tenant_admin", "super_admin"];

const hasPin = (o: TenantOutlet) => typeof o.latitude === "number" && typeof o.longitude === "number" && (o.latitude !== 0 || o.longitude !== 0);

/**
 * Where each outlet is on the map. Deliveries are priced and dispatched from this pin, so it is
 * set per outlet: a business with several outlets gives each its own. The pin is stored in
 * auth-api (the owner of outlets); this page saves it there and logistics picks it up at once.
 */
export function OutletPinsCard({ coverage, authToken }: { coverage?: DeliveryCoverage; authToken?: string }) {
  const { data: outlets = [], isLoading, error } = useTenantOutlets();
  const user = useAuthStore((s) => s.user);
  const savePin = useSaveOutletPin();
  const canEdit = !!(
    (user as { isPlatformOwner?: boolean; isSuperUser?: boolean } | null)?.isPlatformOwner ||
    (user as { isSuperUser?: boolean } | null)?.isSuperUser ||
    user?.roles?.some((r: string) => ADMIN_ROLES.includes(r))
  );

  const [editing, setEditing] = useState<TenantOutlet | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);

  const zones = useMemo<ZoneShape[]>(
    () => (coverage?.zones ?? []).map((z) => ({ id: z.id, name: z.name, boundary: z.boundary, color: z.color, zoneType: z.zone_type })),
    [coverage],
  );
  const centre = coverage?.center ? { latitude: coverage.center.lat, longitude: coverage.center.lng } : undefined;

  const open = (o: TenantOutlet) => {
    const p = hasPin(o) ? { latitude: o.latitude as number, longitude: o.longitude as number } : null;
    setEditing(o);
    setPoint(p);
    setLat(p ? p.latitude.toFixed(6) : "");
    setLng(p ? p.longitude.toFixed(6) : "");
    setLink("");
  };
  const pick = (p: LatLng) => {
    setPoint(p);
    setLat(p.latitude.toFixed(6));
    setLng(p.longitude.toFixed(6));
  };
  const typed = () => {
    const la = Number(lat), lo = Number(lng);
    if (lat.trim() && lng.trim() && Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
      setPoint({ latitude: la, longitude: lo });
    }
  };

  const onSave = async () => {
    if (!editing || !point) return;
    setSaving(true);
    try {
      await savePin(editing, point);
      toast.success(`${editing.name} pin saved`);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the pin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outlet locations</CardTitle>
        <CardDescription>
          Deliveries are priced by distance and dispatched from the outlet&apos;s map pin, so every outlet that delivers needs one. Each
          outlet has its own pin and its own areas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading outlets...
          </p>
        )}
        {error && <p className="text-sm text-destructive">Could not load the outlets.</p>}
        {!isLoading && !error && outlets.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No outlets yet.</p>}

        <ul className="space-y-2">
          {outlets.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {hasPin(o) ? <MapPin className="h-4 w-4 shrink-0 text-primary" /> : <MapPinOff className="h-4 w-4 shrink-0 text-amber-600" />}
                  <span className="truncate">{o.name}</span>
                  {o.is_hq && <Badge variant="secondary">Main outlet</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hasPin(o) ? (
                    <>
                      {(o.latitude as number).toFixed(5)}, {(o.longitude as number).toFixed(5)} ·{" "}
                      <a
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.openstreetmap.org/?mlat=${o.latitude}&mlon=${o.longitude}#map=16/${o.latitude}/${o.longitude}`}
                      >
                        Check it on the map
                      </a>
                    </>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">No map pin yet, so deliveries cannot be priced or dispatched from here.</span>
                  )}
                  {o.address ? ` · ${o.address}` : ""}
                </p>
              </div>
              {canEdit ? (
                <Button size="sm" variant={hasPin(o) ? "outline" : "default"} onClick={() => open(o)}>
                  {hasPin(o) ? "Move pin" : "Set pin"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {!canEdit && outlets.length > 0 && (
          <p className="text-xs text-muted-foreground">Only a business admin can change an outlet&apos;s pin.</p>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Where is ${editing.name}?` : "Outlet location"}</DialogTitle>
            <DialogDescription>
              Tap the map, drag the pin, or type the coordinates. Place it where riders collect orders.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="relative h-96 overflow-hidden rounded-xl border">
              <PointPickerMap
                className="absolute inset-0"
                value={point}
                onChange={pick}
                zones={zones}
                defaultCenter={centre}
                authToken={authToken}
                zoom={16}
              />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input inputMode="decimal" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} onBlur={typed} />
                <Input inputMode="decimal" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} onBlur={typed} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google Maps link or coordinates</p>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onPaste={(e) => {
                    const p = pointFromMapLink(e.clipboardData.getData("text"));
                    if (!p) return;
                    e.preventDefault();
                    setLink("");
                    pick(p);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const p = pointFromMapLink(link);
                    if (p) {
                      setLink("");
                      pick(p);
                    } else {
                      toast.error("Paste a full Google Maps link or coordinates like 0.4545, 34.1272");
                    }
                  }}
                  placeholder="Paste a place link, or 0.4545, 34.1272"
                />
                <p className="text-xs text-muted-foreground">The place pin in the link is used, not the map view around it.</p>
              </div>
              {point && (
                <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  Pin at {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={!point || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save pin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
