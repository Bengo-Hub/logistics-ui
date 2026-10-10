import { circlePolygon, openRing, type ZoneGeometry } from "@bengo-hub/maps";
import type { GeoFence, ZoneInput, ZoneSettings } from "@/types/logistics";

export const ZONE_COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#dc2626", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export const ZONE_TYPE_LABEL: Record<string, string> = {
  delivery: "Delivery area",
  exclusion: "No-delivery area",
  pickup: "Pickup area",
  surge: "Surge area",
};

export const REASON_LABEL: Record<string, string> = {
  excluded_area: "Inside a no-delivery area",
  outside_delivery_area: "Outside the delivery area",
  beyond_max_radius: "Beyond the maximum delivery distance",
  no_outlet_location: "No outlet has a map location yet",
  no_delivery_coverage: "No delivery areas are set up",
  invalid_location: "Invalid location",
  below_min_order: "Below the area's minimum order",
};

/** Editable form state for one zone. */
export interface ZoneDraft {
  id?: string;
  name: string;
  zoneType: string;
  status: string;
  color: string;
  geometry: ZoneGeometry;
  fee: string;
  free: boolean;
  minOrder: string;
  etaMinutes: string;
  priority: string;
  outletIds: string[];
  aliases: string;
  notes: string;
}

export function emptyDraft(center?: { latitude: number; longitude: number }): ZoneDraft {
  return {
    name: "",
    zoneType: "delivery",
    status: "active",
    color: ZONE_COLORS[1],
    geometry: { shape: "circle", center: center ?? null, radiusM: 1500, boundary: [] },
    fee: "",
    free: false,
    minOrder: "0",
    etaMinutes: "",
    priority: "20",
    outletIds: [],
    aliases: "",
    notes: "",
  };
}

export function draftFromZone(z: GeoFence): ZoneDraft {
  const s = z.settings ?? ({} as ZoneSettings);
  const center = s.center ? { latitude: s.center.lat, longitude: s.center.lng } : null;
  return {
    id: z.id,
    name: z.name,
    zoneType: z.zone_type,
    status: z.status,
    color: z.color || ZONE_COLORS[1],
    geometry:
      s.shape === "circle"
        ? { shape: "circle", center, radiusM: s.radius_m ?? 1000, boundary: [] }
        : { shape: "polygon", center, radiusM: 0, boundary: openRing(z.boundary ?? []) },
    fee: s.free ? "0" : String(s.fee ?? 0),
    free: !!s.free,
    minOrder: String(s.min_order ?? 0),
    etaMinutes: s.eta_minutes ? String(s.eta_minutes) : "",
    priority: String(s.priority ?? 0),
    outletIds: s.outlet_ids ?? [],
    aliases: (s.aliases ?? []).join(", "),
    notes: s.notes ?? "",
  };
}

/** Validates a draft and builds the API body, or returns the first problem. */
export function draftToInput(d: ZoneDraft): { input?: ZoneInput; error?: string } {
  if (!d.name.trim()) return { error: "Give the area a name." };
  const g = d.geometry;
  if (g.shape === "circle") {
    if (!g.center) return { error: "Set the centre: tap the map or type the latitude and longitude." };
    if (!(g.radiusM >= 50)) return { error: "The radius must be at least 50 m." };
  } else if (g.boundary.length < 3) {
    return { error: "A polygon needs at least 3 corners. Tap the map to add them." };
  }
  const fee = d.free ? 0 : Number(d.fee || 0);
  if (d.zoneType === "delivery" && !d.free && !(fee > 0)) return { error: "Enter a delivery fee or mark the area free." };
  const settings: ZoneSettings = {
    shape: g.shape,
    center: g.center ? { lat: g.center.latitude, lng: g.center.longitude } : null,
    radius_m: g.shape === "circle" ? Math.round(g.radiusM) : undefined,
    fee,
    free: d.free,
    min_order: Number(d.minOrder || 0),
    eta_minutes: d.etaMinutes ? Number(d.etaMinutes) : undefined,
    priority: Number(d.priority || 0),
    outlet_ids: d.outletIds.length ? d.outletIds : undefined,
    aliases: d.aliases.split(",").map((a) => a.trim()).filter(Boolean),
    notes: d.notes.trim() || undefined,
  };
  return {
    input: {
      name: d.name.trim(),
      zone_type: d.zoneType,
      status: d.status,
      color: d.color,
      boundary: g.shape === "polygon" ? g.boundary : undefined,
      settings,
    },
  };
}

/** Ring for drawing a draft before it is saved. */
export function draftRing(d: ZoneDraft): number[][] {
  const g = d.geometry;
  if (g.shape === "circle") return g.center ? circlePolygon(g.center, Math.max(g.radiusM, 50)) : [];
  return g.boundary;
}

export function money(v: number, currency = "KES"): string {
  return `${currency} ${Math.round(v).toLocaleString()}`;
}

export function feeBadge(z: Pick<GeoFence, "zone_type" | "settings">): string {
  if (z.zone_type === "exclusion") return "No delivery";
  if (z.settings?.free) return "Free";
  return money(z.settings?.fee ?? 0, z.settings?.currency || "KES");
}

/** GeoJSON FeatureCollection of zones, for backup or bulk editing in other tools. */
export function zonesToGeoJSON(zones: GeoFence[]) {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => ({
      type: "Feature",
      properties: { name: z.name, zone_type: z.zone_type, status: z.status, color: z.color, ...z.settings },
      geometry: { type: "Polygon", coordinates: [z.boundary] },
    })),
  };
}

type Feature = { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } };

/** Reads zones from a GeoJSON FeatureCollection (polygons, or points with radius_m). */
export function zonesFromGeoJSON(raw: unknown): { inputs: ZoneInput[]; skipped: number } {
  const fc = raw as { features?: Feature[] };
  const inputs: ZoneInput[] = [];
  let skipped = 0;
  for (const f of fc?.features ?? []) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    const num = (k: string, d = 0) => (typeof p[k] === "number" ? (p[k] as number) : Number(p[k] ?? d) || d);
    const base: Omit<ZoneSettings, "shape"> = {
      fee: num("fee"),
      free: p.free === true,
      min_order: num("min_order"),
      eta_minutes: num("eta_minutes") || undefined,
      priority: num("priority", 20),
      aliases: Array.isArray(p.aliases) ? (p.aliases as string[]) : undefined,
      notes: typeof p.notes === "string" ? p.notes : undefined,
    };
    const common = {
      name,
      zone_type: String(p.zone_type ?? "delivery"),
      status: String(p.status ?? "active"),
      color: String(p.color ?? ZONE_COLORS[1]),
    };
    const g = f.geometry;
    if (!name || !g) {
      skipped++;
      continue;
    }
    if (g.type === "Polygon" && Array.isArray(g.coordinates) && Array.isArray(g.coordinates[0])) {
      const isCircle = p.shape === "circle" && p.center && p.radius_m;
      inputs.push(
        isCircle
          ? { ...common, settings: { ...base, shape: "circle", center: p.center as { lat: number; lng: number }, radius_m: num("radius_m") } }
          : { ...common, boundary: g.coordinates[0] as number[][], settings: { ...base, shape: "polygon" } },
      );
    } else if (g.type === "Point" && Array.isArray(g.coordinates) && num("radius_m") > 0) {
      const [lng, lat] = g.coordinates as number[];
      inputs.push({ ...common, settings: { ...base, shape: "circle", center: { lat, lng }, radius_m: num("radius_m") } });
    } else {
      skipped++;
    }
  }
  return { inputs, skipped };
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reads a point from a pasted Google Maps link or coordinates. The place pin in a link
 * (!3d<lat>!4d<lng>) wins over the map view (@lat,lng), which is only where the map was
 * looking. Also accepts "?q=lat,lng" and plain "0.4633, 34.1052" (Google's right-click copy).
 * Short maps.app.goo.gl links carry no coordinates: open them and copy the full link.
 */
export function pointFromMapLink(text: string): { latitude: number; longitude: number } | null {
  const t = decodeURIComponent(text.trim());
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const latitude = Number(m[1]);
    const longitude = Number(m[2]);
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return { latitude, longitude };
  }
  return null;
}
