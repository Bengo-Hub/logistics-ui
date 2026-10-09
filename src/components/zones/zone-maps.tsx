"use client";

import { useEffect, useMemo } from "react";
import maplibregl from "maplibre-gl";
import {
  LocationPicker,
  MapContainer,
  ZoneEditor,
  ZoneLayer,
  ringsBounds,
  type LatLng,
  type ZoneGeometry,
  type ZoneShape,
} from "@bengo-hub/maps";
import type { Map as MaplibreMap } from "maplibre-gl";
import { LogisticsMapProvider } from "@/components/maps/logistics-map-provider";
import type { OutletPoint } from "@/types/logistics";

// These components touch window and WebGL; pages load them with next/dynamic (ssr: false).

function OutletPins({ map, outlets }: { map: MaplibreMap; outlets: OutletPoint[] }) {
  useEffect(() => {
    const pins = outlets.map((o) => {
      const el = document.createElement("div");
      el.title = o.name;
      Object.assign(el.style, {
        width: "16px",
        height: "16px",
        borderRadius: "4px",
        background: "#111827",
        border: "2px solid #ffffff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      });
      return new maplibregl.Marker({ element: el }).setLngLat([o.location.lng, o.location.lat]).addTo(map);
    });
    return () => pins.forEach((p) => p.remove());
  }, [map, outlets]);
  return null;
}

function FitToZones({ map, zones, outlets }: { map: MaplibreMap; zones: ZoneShape[]; outlets: OutletPoint[] }) {
  const key = zones.map((z) => z.id).join(",");
  useEffect(() => {
    const rings = zones.filter((z) => !z.muted).map((z) => z.boundary);
    outlets.forEach((o) => rings.push([[o.location.lng, o.location.lat]]));
    const b = ringsBounds(rings);
    if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40, maxZoom: 14, duration: 0 });
    // Fit when the set of zones changes, not on every style tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** All zones of the tenant with outlet pins. Clicking a zone selects it. */
export function ZonesOverviewMap({
  zones,
  outlets,
  onZoneClick,
  authToken,
  className,
}: {
  zones: ZoneShape[];
  outlets: OutletPoint[];
  onZoneClick?: (id: string) => void;
  authToken?: string;
  className?: string;
}) {
  return (
    <LogisticsMapProvider authToken={authToken}>
      <MapContainer className={className} zoom={11}>
        {(map) => (
          <>
            <ZoneLayer map={map} zones={zones} onZoneClick={onZoneClick} />
            <OutletPins map={map} outlets={outlets} />
            <FitToZones map={map} zones={zones} outlets={outlets} />
          </>
        )}
      </MapContainer>
    </LogisticsMapProvider>
  );
}

/** Edit one zone's circle or polygon on the map. */
export function ZoneEditorMap({
  value,
  onChange,
  otherZones,
  outlets,
  color,
  authToken,
  className,
}: {
  value: ZoneGeometry;
  onChange: (g: ZoneGeometry) => void;
  otherZones: ZoneShape[];
  outlets: OutletPoint[];
  color: string;
  authToken?: string;
  className?: string;
}) {
  const outletPins = useMemo(
    () => outlets.map((o) => ({ name: o.name, location: { latitude: o.location.lat, longitude: o.location.lng } })),
    [outlets],
  );
  const fallback = outletPins[0]?.location;
  return (
    <LogisticsMapProvider authToken={authToken}>
      <ZoneEditor
        className={className}
        value={value}
        onChange={onChange}
        otherZones={otherZones}
        outlets={outletPins}
        color={color}
        defaultCenter={fallback}
      />
    </LogisticsMapProvider>
  );
}

/** Pick a point (quote tester) over the tenant's zones. */
export function PointPickerMap({
  value,
  onChange,
  zones,
  defaultCenter,
  authToken,
  className,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  zones: ZoneShape[];
  defaultCenter?: LatLng;
  authToken?: string;
  className?: string;
}) {
  return (
    <LogisticsMapProvider authToken={authToken}>
      <LocationPicker className={className} value={value} onChange={(p) => onChange(p)} zones={zones} defaultCenter={defaultCenter} zoom={13} />
    </LogisticsMapProvider>
  );
}
