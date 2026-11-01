"use client";

import { LiveFleetMap } from "@bengo-hub/maps";
import type { FleetRider } from "@bengo-hub/maps";
import { LogisticsMapProvider } from "@/components/maps/logistics-map-provider";
import { useWorkingOutlet } from "@/hooks/use-zones";

interface FleetMapProps {
  tenantSlug: string;
  authToken?: string;
  className?: string;
  onRiderClick?: (rider: FleetRider) => void;
  onRidersUpdate?: (riders: FleetRider[]) => void;
}

export function FleetMap({ tenantSlug, authToken, className, onRiderClick, onRidersUpdate }: FleetMapProps) {
  // Opens on the outlet being worked in until riders are on the map.
  const outlet = useWorkingOutlet();
  const center: [number, number] | undefined = outlet ? [outlet.location.lng, outlet.location.lat] : undefined;
  return (
    <LogisticsMapProvider authToken={authToken}>
      <LiveFleetMap
        tenantSlug={tenantSlug}
        {...(center ? { center } : {})}
        className={className}
        onRiderClick={onRiderClick}
        onRidersUpdate={onRidersUpdate}
      />
    </LogisticsMapProvider>
  );
}
