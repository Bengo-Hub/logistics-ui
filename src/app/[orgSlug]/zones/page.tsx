"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Copy, Download, Hexagon, Loader2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ZoneShape } from "@bengo-hub/maps";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/base";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryPricingCard } from "@/components/zones/delivery-pricing-card";
import { QuoteTester } from "@/components/zones/quote-tester";
import { ZoneFormSheet } from "@/components/zones/zone-form-sheet";
import { ZoneStatsCard } from "@/components/zones/zone-stats-card";
import {
  ZONE_TYPE_LABEL,
  downloadJSON,
  draftFromZone,
  emptyDraft,
  feeBadge,
  zonesFromGeoJSON,
  zonesToGeoJSON,
  type ZoneDraft,
} from "@/components/zones/zone-utils";
import { useMyPermissions } from "@/hooks/use-module-access";
import { useCreateZone, useDeleteZone, useDeliveryCoverage, useZones } from "@/hooks/use-zones";
import { useAuthStore } from "@/store/auth";
import type { GeoFence } from "@/types/logistics";

const ZonesOverviewMap = dynamic(() => import("@/components/zones/zone-maps").then((m) => m.ZonesOverviewMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />,
});

const statusVariant: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  draft: "warning",
};

export default function ZonesPage() {
  const { data: zones = [], isLoading, error } = useZones();
  const { data: coverage } = useDeliveryCoverage();
  const { hasPermission } = useMyPermissions();
  const authToken = useAuthStore((s) => s.session?.accessToken ?? undefined);
  const canManageZones = hasPermission("logistics.zones.manage");
  const canManagePricing = hasPermission("logistics.pricing.manage");
  const deleteZone = useDeleteZone();
  const createZone = useCreateZone();

  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ZoneDraft>(emptyDraft());
  const [toDelete, setToDelete] = useState<GeoFence | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const outlets = coverage?.outlets ?? [];
  const defaultCenter = outlets[0] ? { latitude: outlets[0].location.lat, longitude: outlets[0].location.lng } : undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? zones.filter((z) => z.name.toLowerCase().includes(q) || (z.settings?.aliases ?? []).some((a) => a.toLowerCase().includes(q)))
      : zones;
    // Free and cheaper areas first, drafts last, so the list reads like a tariff sheet.
    return [...list].sort((a, b) => {
      const da = a.status === "active" ? 0 : 1, db = b.status === "active" ? 0 : 1;
      if (da !== db) return da - db;
      const fa = a.settings?.free ? -1 : a.settings?.fee ?? 0, fb = b.settings?.free ? -1 : b.settings?.fee ?? 0;
      return fa - fb || a.name.localeCompare(b.name);
    });
  }, [zones, search]);

  const shapes = useMemo<ZoneShape[]>(
    () =>
      zones.map((z) => ({
        id: z.id,
        name: z.name,
        boundary: z.boundary,
        color: z.color,
        zoneType: z.zone_type,
        muted: z.status !== "active",
        badge: z.status === "active" ? feeBadge(z) : z.status,
      })),
    [zones],
  );

  const openCreate = () => {
    setDraft(emptyDraft(defaultCenter));
    setSheetOpen(true);
  };
  const openEdit = (z: GeoFence) => {
    setDraft(draftFromZone(z));
    setSheetOpen(true);
  };
  const duplicate = (z: GeoFence) => {
    const d = draftFromZone(z);
    setDraft({ ...d, id: undefined, name: `${z.name} copy`, status: "draft" });
    setSheetOpen(true);
  };

  const onImport = async (file: File) => {
    setImporting(true);
    try {
      const { inputs, skipped } = zonesFromGeoJSON(JSON.parse(await file.text()));
      const existing = new Set(zones.map((z) => z.name.toLowerCase()));
      let added = 0, failed = 0;
      for (const input of inputs) {
        if (existing.has(input.name.toLowerCase())) {
          failed++;
          continue;
        }
        try {
          await createZone.mutateAsync(input);
          added++;
        } catch {
          failed++;
        }
      }
      toast.success(`Imported ${added} area${added === 1 ? "" : "s"}${failed + skipped ? `, skipped ${failed + skipped} (duplicates or invalid)` : ""}`);
    } catch {
      toast.error("That file is not valid GeoJSON");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Hexagon className="h-6 w-6 text-primary" /> Delivery areas
          </h1>
          <p className="text-sm text-muted-foreground">
            Where you deliver and what it costs. Ordering, POS deliveries and riders all use these settings.
          </p>
        </div>
        {canManageZones && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add area
          </Button>
        )}
      </div>

      <Tabs defaultValue="areas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="areas">Areas</TabsTrigger>
          <TabsTrigger value="pricing">Pricing and geofence</TabsTrigger>
          <TabsTrigger value="test">Test a location</TabsTrigger>
          <TabsTrigger value="stats">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="areas">
          <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
            <Card className="order-2 lg:order-1">
              <CardContent className="space-y-3 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search areas" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadJSON("delivery-areas.geojson", zonesToGeoJSON(zones))} disabled={!zones.length}>
                    <Download className="mr-1 h-4 w-4" /> Export
                  </Button>
                  {canManageZones && (
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
                      {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />} Import GeoJSON
                    </Button>
                  )}
                  <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
                </div>
                {outlets.length === 0 && (
                  <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                    No outlet has a map location yet. Set it under Branches in the account settings, otherwise distance pricing and
                    dispatch cannot start from the outlet.
                  </p>
                )}

                {isLoading && (
                  <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading areas...
                  </p>
                )}
                {error && <p className="text-sm text-destructive">Failed to load areas.</p>}
                {!isLoading && filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">{zones.length ? "No areas match." : "No delivery areas yet."}</p>
                )}

                <ul className="max-h-140 space-y-2 overflow-y-auto pr-1">
                  {filtered.map((z) => (
                    <li key={z.id} className="rounded-xl border p-3 hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="min-w-0 text-left" onClick={() => openEdit(z)}>
                          <p className="flex items-center gap-2 font-medium">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: z.zone_type === "exclusion" ? "#ef4444" : z.color }} />
                            <span className="truncate">{z.name}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {ZONE_TYPE_LABEL[z.zone_type] ?? z.zone_type} ·{" "}
                            {z.settings?.shape === "circle" ? `${((z.settings.radius_m ?? 0) / 1000).toFixed(1)} km radius` : `${z.area_km2} km²`}
                            {z.zone_type === "delivery" ? ` · priority ${z.settings?.priority ?? 0}` : ""}
                          </p>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold">{feeBadge(z)}</span>
                          <Badge variant={statusVariant[z.status] ?? "secondary"}>{z.status}</Badge>
                        </div>
                      </div>
                      {z.settings?.notes && z.status !== "active" && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{z.settings.notes}</p>}
                      {canManageZones && (
                        <div className="mt-2 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(z)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => duplicate(z)}>
                            <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(z)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="relative order-1 h-105 overflow-hidden rounded-xl border lg:order-2 lg:h-auto lg:min-h-160">
              <ZonesOverviewMap
                className="absolute inset-0"
                zones={shapes}
                outlets={outlets}
                authToken={authToken}
                onZoneClick={(id) => {
                  const z = zones.find((x) => x.id === id);
                  if (z) openEdit(z);
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <DeliveryPricingCard canManage={canManagePricing} />
        </TabsContent>

        <TabsContent value="test">
          <QuoteTester coverage={coverage} authToken={authToken} />
        </TabsContent>

        <TabsContent value="stats">
          <ZoneStatsCard />
        </TabsContent>
      </Tabs>

      <ZoneFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        draft={draft}
        setDraft={setDraft}
        zones={zones}
        outlets={outlets}
        canManage={canManageZones}
        authToken={authToken}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "area"}?`}
        description="Customers in this area will be quoted by distance (or refused) from now on. This cannot be undone."
        confirmLabel="Delete area"
        pending={deleteZone.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteZone.mutateAsync(toDelete.id);
            toast.success(`${toDelete.name} deleted`);
          } catch {
            toast.error("Could not delete the area");
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}
