"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { FleetRider } from "@bengo-hub/maps";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import { useAuthStore } from "@/store/auth";

// The one live fleet map in logistics-ui (dashboard and Tracking page). It loads the map
// client-side only, signs the fleet WebSocket with the session token, and sits behind the
// live_tracking plan feature that the API enforces.
const FleetMap = dynamic(() => import("@/components/fleet-map").then((m) => ({ default: m.FleetMap })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/20">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function FleetMapPanel({
  tenantSlug,
  className = "h-full w-full",
  onRiderClick,
  onRidersUpdate,
}: {
  tenantSlug: string;
  className?: string;
  onRiderClick?: (rider: FleetRider) => void;
  onRidersUpdate?: (riders: FleetRider[]) => void;
}) {
  const authToken = useAuthStore((s) => s.session?.accessToken) ?? undefined;
  return (
    <SubscriptionGate feature="live_tracking">
      <FleetMap
        tenantSlug={tenantSlug}
        authToken={authToken}
        className={className}
        onRiderClick={onRiderClick}
        onRidersUpdate={onRidersUpdate}
      />
    </SubscriptionGate>
  );
}
