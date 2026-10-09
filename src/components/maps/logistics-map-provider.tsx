"use client";

import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapProvider } from "@bengo-hub/maps";

/** Self-hosted tile server and logistics API base, overridable per environment. */
export const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL ?? "https://tiles.codevertexafrica.com";
export const LOGISTICS_API_BASE = (() => {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "https://logisticsapi.codevertexafrica.com").replace(/\/+$/, "");
  return raw.includes("/api/v1") ? raw : `${raw}/api/v1`;
})();

/** One MapProvider configuration for every map in logistics-ui. */
export function LogisticsMapProvider({ authToken, children }: { authToken?: string; children: ReactNode }) {
  return (
    <MapProvider tileServerUrl={TILE_SERVER_URL} apiBaseUrl={LOGISTICS_API_BASE} authToken={authToken}>
      {children}
    </MapProvider>
  );
}
