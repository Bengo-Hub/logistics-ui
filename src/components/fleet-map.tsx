"use client";

import { LiveFleetMap } from "@bengo-hub/maps";
import type { FleetRider } from "@bengo-hub/maps";
import { LogisticsMapProvider } from "@/components/maps/logistics-map-provider";

interface FleetMapProps {
  tenantSlug: string;
  authToken?: string;
  className?: string;
  onRiderClick?: (rider: FleetRider) => void;
  onRidersUpdate?: (riders: FleetRider[]) => void;
}

export function FleetMap({ tenantSlug, authToken, className, onRiderClick, onRidersUpdate }: FleetMapProps) {
  return (
    <LogisticsMapProvider authToken={authToken}>
      <LiveFleetMap
        tenantSlug={tenantSlug}
        className={className}
        onRiderClick={onRiderClick}
        onRidersUpdate={onRidersUpdate}
      />
    </LogisticsMapProvider>
  );
}
