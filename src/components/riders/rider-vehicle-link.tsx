"use client";

import { useState } from "react";
import { Loader2, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/base";
import { PermissionGate } from "@/components/ui/module-gate";
import { InsuranceBadge } from "@/components/vehicles/insurance-badge";
import { RenewInsuranceDialog } from "@/components/vehicles/renew-insurance-dialog";
import { EMPTY_VEHICLE, VehicleForm, vehicleMissing, vehicleRequest, type VehicleDraft } from "@/components/vehicles/vehicle-form";
import { useAssignVehicle, useCreateVehicle, useFleetVehicles } from "@/hooks/use-fleet";
import { apiErrorText } from "@/lib/utils";
import type { FleetMember } from "@/types/logistics";

const SELECT_CLASS =
  "flex h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * A rider's vehicle: the linked one with its insurance (unlink, add or renew insurance), or ways to
 * give them one: pick a free fleet vehicle, or register their vehicle with its insurance here.
 */
export function RiderVehicleLink({ member }: { member: FleetMember }) {
  const vehicle = member.edges?.vehicles?.[0];
  const [vehicleId, setVehicleId] = useState("");
  const [registering, setRegistering] = useState(false);
  const [draft, setDraft] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const [renewing, setRenewing] = useState(false);
  const assign = useAssignVehicle();
  const create = useCreateVehicle();
  const { data: free } = useFleetVehicles({ assigned: false, limit: 100 }, !vehicle);
  const ins = member.vehicle_insurance;

  const link = (id: string | null, message: string) =>
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
      <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
        <div className="flex items-center gap-2">
          <Truck className="size-4 shrink-0 text-primary" />
          <span className="font-medium">{[vehicle.make, vehicle.model].filter((p) => p && p !== "Unknown").join(" ") || vehicle.vehicle_type}</span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{vehicle.license_plate}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InsuranceBadge view={ins} />
          {ins?.policy_no && <span className="text-[11px] text-muted-foreground">Policy {ins.policy_no}</span>}
        </div>
        {member.dispatch_block_message && <p className="text-xs text-destructive">{member.dispatch_block_message}.</p>}
        <PermissionGate permission="logistics.fleet.manage">
          <div className="flex flex-wrap gap-2">
            {ins && ins.status !== "not_required" && (
              <Button size="sm" variant="outline" onClick={() => setRenewing(true)}>
                {ins.policy_no ? "Renew insurance" : "Add insurance"}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={assign.isPending} onClick={() => link(null, "Vehicle unlinked")}>
              {assign.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Unlink"}
            </Button>
          </div>
          <RenewInsuranceDialog vehicleId={vehicle.id} plate={vehicle.license_plate} current={ins} open={renewing} onOpenChange={setRenewing} />
        </PermissionGate>
      </div>
    );
  }

  const options = free?.data ?? [];
  const missing = vehicleMissing(draft);
  const register = () =>
    create.mutate(vehicleRequest(draft, member.id), {
      onSuccess: () => {
        setRegistering(false);
        setDraft(EMPTY_VEHICLE);
        toast.success("Vehicle registered and linked");
      },
      onError: (err) => toast.error(apiErrorText(err, "Could not register the vehicle")),
    });

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">No vehicle assigned.</p>
      <PermissionGate permission="logistics.fleet.manage">
        {registering ? (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <VehicleForm value={draft} onChange={setDraft} />
            <div className="flex gap-2">
              <Button size="sm" onClick={register} disabled={!!missing || create.isPending} title={missing ? `Add the ${missing}` : undefined}>
                {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Register and link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRegistering(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {options.length > 0 && (
              <div className="flex gap-2">
                <select className={SELECT_CLASS} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">Select a free vehicle...</option>
                  {options.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.license_plate} ({v.vehicle_type})
                    </option>
                  ))}
                </select>
                <Button size="sm" disabled={!vehicleId || assign.isPending} onClick={() => link(vehicleId, "Vehicle linked")}>
                  {assign.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Link"}
                </Button>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => setRegistering(true)}>
              <Plus className="size-3.5" /> Register this rider&apos;s vehicle
            </Button>
          </>
        )}
      </PermissionGate>
    </div>
  );
}
