"use client";

import { MapProvider, LiveFleetMap } from "@bengo-hub/maps";
import type { FleetRider } from "@bengo-hub/maps";

const TILE_SERVER = "https://tiles.codevertexitsolutions.com";
const API_BASE = "https://logisticsapi.codevertexitsolutions.com/api/v1";

interface FleetMapProps {
  tenantSlug: string;
  authToken?: string;
  className?: string;
  onRiderClick?: (rider: FleetRider) => void;
  onRidersUpdate?: (riders: FleetRider[]) => void;
}

export function FleetMap({ tenantSlug, authToken, className, onRiderClick, onRidersUpdate }: FleetMapProps) {
  return (
    <MapProvider
      tileServerUrl={TILE_SERVER}
      apiBaseUrl={`${API_BASE}`}
      authToken={authToken}
    >
      <LiveFleetMap
        tenantSlug={tenantSlug}
        className={className}
        onRiderClick={onRiderClick}
        onRidersUpdate={onRidersUpdate}
      />
    </MapProvider>
  );
}
