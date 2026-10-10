"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Circle, Loader2, MapPin, Search, Spline } from "lucide-react";
import { toast } from "sonner";
import type { ZoneGeometry, ZoneShape } from "@bengo-hub/maps";
import { Button, Input } from "@/components/ui/base";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateZone, usePlaceSearch, useUpdateZone } from "@/hooks/use-zones";
import type { GeoFence, OutletPoint } from "@/types/logistics";
import { ZONE_COLORS, draftToInput, pointFromMapLink, type ZoneDraft } from "./zone-utils";

const ZoneEditorMap = dynamic(() => import("./zone-maps").then((m) => m.ZoneEditorMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />,
});

const label = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const selectCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ZoneDraft;
  setDraft: (d: ZoneDraft) => void;
  zones: GeoFence[];
  outlets: OutletPoint[];
  canManage: boolean;
  authToken?: string;
}

/** Add or edit a delivery area: map editing, typed coordinates and delivery settings. */
export function ZoneFormSheet({ open, onOpenChange, draft, setDraft, zones, outlets, canManage, authToken }: Props) {
  const create = useCreateZone();
  const update = useUpdateZone();
  const saving = create.isPending || update.isPending;
  const [error, setError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [mapLink, setMapLink] = useState("");
  const places = usePlaceSearch(placeQuery);

  useEffect(() => {
    if (open) {
      setError(null);
      setPlaceQuery("");
    }
  }, [open, draft.id]);

  const set = (patch: Partial<ZoneDraft>) => setDraft({ ...draft, ...patch });
  const setGeo = (g: ZoneGeometry) => set({ geometry: g });
  const g = draft.geometry;

  const otherZones = useMemo<ZoneShape[]>(
    () => zones.filter((z) => z.id !== draft.id).map((z) => ({ id: z.id, name: z.name, boundary: z.boundary, color: z.color, zoneType: z.zone_type })),
    [zones, draft.id],
  );

  const save = async () => {
    const { input, error: problem } = draftToInput(draft);
    if (!input) {
      setError(problem ?? "Check the form.");
      return;
    }
    setError(null);
    try {
      if (draft.id) {
        await update.mutateAsync({ zoneId: draft.id, ...input });
        toast.success(`${input.name} updated`);
      } else {
        await create.mutateAsync(input);
        toast.success(`${input.name} added`);
      }
      onOpenChange(false);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not save the area.";
      setError(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Full screen so the map has room; the form scrolls on its own column. */}
      <SheetContent side="right" className="!w-screen !max-w-none flex flex-col">
        <SheetHeader>
          <SheetTitle>{draft.id ? `Edit ${draft.name || "area"}` : "Add a delivery area"}</SheetTitle>
          <SheetDescription>
            Draw on the map or type the coordinates. Customers in this area are charged its fee; pins outside every area use the
            distance rate when they are close enough.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="grid flex-1 gap-5 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden">
          <div className="flex min-h-[60vh] flex-col gap-2 lg:min-h-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={g.shape === "circle" ? "default" : "outline"}
                onClick={() => setGeo({ ...g, shape: "circle", radiusM: g.radiusM > 0 ? g.radiusM : 1500 })}
              >
                <Circle className="mr-1 h-4 w-4" /> Circle
              </Button>
              <Button type="button" size="sm" variant={g.shape === "polygon" ? "default" : "outline"} onClick={() => setGeo({ ...g, shape: "polygon" })}>
                <Spline className="mr-1 h-4 w-4" /> Polygon
              </Button>
              {g.shape === "polygon" && g.boundary.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setGeo({ ...g, boundary: [] })}>
                  Clear corners
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {g.shape === "circle"
                  ? "Tap the map to place the centre, drag the orange handle to resize."
                  : "Tap to add corners, drag to move, double-click a corner to remove it."}
              </span>
            </div>
            <div className="relative min-h-[50vh] flex-1 overflow-hidden rounded-xl border lg:min-h-0">
              <ZoneEditorMap
                className="absolute inset-0"
                value={g}
                onChange={setGeo}
                otherZones={otherZones}
                outlets={outlets}
                color={draft.zoneType === "exclusion" ? "#ef4444" : draft.color}
                authToken={authToken}
              />
            </div>
          </div>

          <div className="space-y-4 lg:overflow-y-auto lg:pr-1">
            <div className="space-y-1">
              <p className={label}>Name</p>
              <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Alupe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className={label}>Type</p>
                <select className={selectCls} value={draft.zoneType} onChange={(e) => set({ zoneType: e.target.value })}>
                  <option value="delivery">Delivery area</option>
                  <option value="exclusion">No-delivery area</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className={label}>Status</p>
                <select className={selectCls} value={draft.status} onChange={(e) => set({ status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="draft">Draft (not quoted)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Place search sets the centre (circle) or adds a corner (polygon). */}
            <div className="space-y-1">
              <p className={label}>Find a place</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder="Search a town, market or landmark" />
              </div>
              {placeQuery.trim().length >= 3 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-background text-sm">
                  {places.isFetching && <p className="flex items-center gap-2 px-3 py-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Searching...</p>}
                  {!places.isFetching && (places.data ?? []).length === 0 && <p className="px-3 py-2 text-muted-foreground">No places found.</p>}
                  {(places.data ?? []).map((p, i) => (
                    <button
                      key={`${p.display_name}-${i}`}
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        const c = { latitude: p.location.lat, longitude: p.location.lng };
                        const geometry: ZoneGeometry =
                          g.shape === "circle" ? { ...g, center: c } : { ...g, boundary: [...g.boundary, [c.longitude, c.latitude]] };
                        set(draft.name.trim() ? { geometry } : { geometry, name: p.name });
                        setPlaceQuery("");
                      }}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground line-clamp-1">{p.display_name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* A Google Maps link or copied coordinates set the centre (or add a corner). */}
            <div className="space-y-1">
              <p className={label}>Google Maps link or coordinates</p>
              <Input
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
                onPaste={(e) => {
                  const pt = pointFromMapLink(e.clipboardData.getData("text"));
                  if (!pt) return;
                  e.preventDefault();
                  setMapLink("");
                  setGeo(g.shape === "circle" ? { ...g, center: pt } : { ...g, boundary: [...g.boundary, [pt.longitude, pt.latitude]] });
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const pt = pointFromMapLink(mapLink);
                  if (!pt) {
                    setError("Paste a full Google Maps link (open short links first) or coordinates like 0.4633, 34.1052.");
                    return;
                  }
                  setMapLink("");
                  setGeo(g.shape === "circle" ? { ...g, center: pt } : { ...g, boundary: [...g.boundary, [pt.longitude, pt.latitude]] });
                }}
                placeholder="Paste a place link, or 0.4633, 34.1052"
              />
              <p className="text-xs text-muted-foreground">The place pin in the link is used, not the map view around it.</p>
            </div>

            {g.shape === "circle" ? (
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label="Latitude"
                  value={g.center?.latitude}
                  onCommit={(v) => setGeo({ ...g, center: { latitude: v, longitude: g.center?.longitude ?? 0 } })}
                />
                <NumberField
                  label="Longitude"
                  value={g.center?.longitude}
                  onCommit={(v) => setGeo({ ...g, center: { latitude: g.center?.latitude ?? 0, longitude: v } })}
                />
                <NumberField label="Radius (m)" value={g.radiusM} step={50} onCommit={(v) => setGeo({ ...g, radiusM: Math.max(50, v) })} />
              </div>
            ) : (
              <CornersField boundary={g.boundary} onCommit={(boundary) => setGeo({ ...g, boundary })} />
            )}

            {draft.zoneType === "delivery" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className={label}>Delivery fee</p>
                    <Input type="number" min={0} disabled={draft.free} value={draft.free ? "0" : draft.fee} onChange={(e) => set({ fee: e.target.value })} placeholder="150" />
                  </div>
                  <label className="mt-6 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.free} onChange={(e) => set({ free: e.target.checked })} />
                    Free delivery
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className={label}>Min order</p>
                    <Input type="number" min={0} value={draft.minOrder} onChange={(e) => set({ minOrder: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <p className={label}>ETA (min)</p>
                    <Input type="number" min={0} value={draft.etaMinutes} onChange={(e) => set({ etaMinutes: e.target.value })} placeholder="Auto" />
                  </div>
                  <div className="space-y-1">
                    <p className={label}>Priority</p>
                    <Input type="number" value={draft.priority} onChange={(e) => set({ priority: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Where areas overlap, the higher priority wins, then the smaller area.</p>
              </>
            )}

            {outlets.length > 1 && (
              <div className="space-y-1">
                <p className={label}>Served by outlets</p>
                <div className="space-y-1 rounded-lg border p-2 text-sm">
                  {outlets.map((o) => (
                    <label key={o.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.outletIds.includes(o.id)}
                        onChange={(e) => set({ outletIds: e.target.checked ? [...draft.outletIds, o.id] : draft.outletIds.filter((x) => x !== o.id) })}
                      />
                      {o.name}
                    </label>
                  ))}
                  <p className="text-xs text-muted-foreground">None ticked means every outlet.</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className={label}>Other names (comma separated)</p>
              <Input value={draft.aliases} onChange={(e) => set({ aliases: e.target.value })} placeholder="Alupe Market, Alupe University" />
            </div>
            <div className="space-y-1">
              <p className={label}>Colour</p>
              <div className="flex gap-2">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => set({ color: c })}
                    className={`h-7 w-7 rounded-full border-2 ${draft.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className={label}>Notes</p>
              <textarea className="min-h-15 w-full rounded-lg border border-input bg-background p-2 text-sm" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canManage || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {draft.id ? "Save changes" : "Add area"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Number input that keeps its own text while typing and commits valid numbers. */
function NumberField({ label: text, value, onCommit, step }: { label: string; value?: number | null; onCommit: (v: number) => void; step?: number }) {
  const [txt, setTxt] = useState(value == null ? "" : String(value));
  useEffect(() => setTxt(value == null ? "" : String(value)), [value]);
  return (
    <div className="space-y-1">
      <p className={label}>{text}</p>
      <Input
        inputMode="decimal"
        step={step}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => {
          const v = Number(txt);
          if (txt.trim() !== "" && Number.isFinite(v)) onCommit(v);
          else setTxt(value == null ? "" : String(value));
        }}
      />
    </div>
  );
}

/** Polygon corners as "lat, lng" lines; paste a list to replace the shape. */
function CornersField({ boundary, onCommit }: { boundary: number[][]; onCommit: (b: number[][]) => void }) {
  const toText = (b: number[][]) => b.map(([lng, lat]) => `${lat}, ${lng}`).join("\n");
  const [txt, setTxt] = useState(toText(boundary));
  useEffect(() => setTxt(toText(boundary)), [boundary]);
  const apply = () => {
    const pts: number[][] = [];
    for (const line of txt.split(/\n+/)) {
      const parts = line.split(/[,\s]+/).filter(Boolean).map(Number);
      if (parts.length >= 2 && parts.every(Number.isFinite)) pts.push([parts[1], parts[0]]);
    }
    if (pts.length >= 3 || pts.length === 0) onCommit(pts);
    else {
      toast.error("A polygon needs at least 3 corners");
      setTxt(toText(boundary));
    }
  };
  return (
    <div className="space-y-1">
      <p className={label}>Corners (one &quot;latitude, longitude&quot; per line)</p>
      <textarea
        className="min-h-24 w-full rounded-lg border border-input bg-background p-2 font-mono text-xs"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={apply}
        placeholder={"0.4600, 34.1100\n0.4600, 34.1400\n0.4400, 34.1400"}
      />
    </div>
  );
}
