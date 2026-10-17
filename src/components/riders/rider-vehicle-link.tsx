"use client";

import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/base";
import { PermissionGate } from "@/components/ui/module-gate";
import { useAssignVehicle, useFleetVehicles } from "@/hooks/use-fleet";
import { apiErrorText } from "@/lib/utils";
import type { FleetMember } from "@/types/logistics";

const SELECT_CLASS =
  "flex h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** The rider's vehicle with an unlink button, or a picker of free vehicles to link one. */
export function RiderVehicleLink({ member }: { member: FleetMember }) {
  const vehicle = member.edges?.vehicles?.[0];
  const [vehicleId, setVehicleId] = useState("");
  const assign = useAssignVehicle();
  const { data: free } = useFleetVehicles({ assigned: false, limit: 100 }, !vehicle);

  const run = (id: string | null, message: string) =>
    assign.mutate(
      { memberId: member.id, vehicleId: id },
      {
        onSuccess: () => {
          setVehicleId("");
          toast.success(message);
        },
        onError: (err) => toast.error(apiErrorText(err, "Could not change the vehicle")),
      },
    );

  if (vehicle) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
        <Truck className="size-4 shrink-0 text-primary" />
        <span className="font-medium">{[vehicle.make, vehicle.model].filter((p) => p && p !== "Unknown").join(" ") || vehicle.vehicle_type}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{vehicle.license_plate}</span>
        <PermissionGate permission="logistics.fleet.manage">
          <Button size="sm" variant="ghost" disabled={assign.isPending} onClick={() => run(null, "Vehicle unlinked")}>
            {assign.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Unlink"}
          </Button>
        </PermissionGate>
      </div>
    );
  }

  const options = free?.data ?? [];
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">No vehicle assigned.</p>
      <PermissionGate permission="logistics.fleet.manage">
        {options.length > 0 ? (
          <div className="flex gap-2">
            <select className={SELECT_CLASS} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Select a free vehicle...</option>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} ({v.vehicle_type})
                </option>
              ))}
            </select>
            <Button size="sm" disabled={!vehicleId || assign.isPending} onClick={() => run(vehicleId, "Vehicle linked")}>
              {assign.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Link"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No free vehicles. Add one on the Vehicles page.</p>
        )}
      </PermissionGate>
    </div>
  );
}
