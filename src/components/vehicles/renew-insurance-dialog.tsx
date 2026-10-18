"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/base";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecordVehicleInsurance } from "@/hooks/use-fleet";
import { apiErrorText } from "@/lib/utils";
import type { InsuranceInput, InsuranceView } from "@/types/logistics";
import { formatDay } from "./insurance-badge";
import { cleanInsurance, EMPTY_INSURANCE, InsuranceFields, insuranceMissing } from "./insurance-fields";

/** Record or renew a vehicle's policy. A vehicle deactivated for an expired policy is reactivated. */
export function RenewInsuranceDialog({
  vehicleId,
  plate,
  current,
  open,
  onOpenChange,
}: {
  vehicleId: string;
  plate: string;
  current?: InsuranceView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<InsuranceInput>(EMPTY_INSURANCE);
  const record = useRecordVehicleInsurance();

  // A renewal usually keeps the insurer and cover; the dates and numbers are new.
  useEffect(() => {
    if (open) setForm({ ...EMPTY_INSURANCE, insurer: current?.insurer ?? "", cover: current?.cover ?? "" });
  }, [open, current?.insurer, current?.cover]);

  const missing = insuranceMissing(form);
  const save = () =>
    record.mutate(
      { vehicleId, ...cleanInsurance(form) },
      {
        onSuccess: () => {
          toast.success(`Insurance saved for ${plate}`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(apiErrorText(err, "Could not save the insurance")),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{current?.policy_no ? "Renew insurance" : "Add insurance"}: {plate}</DialogTitle>
        </DialogHeader>
        {current?.policy_no && (
          <p className="text-xs text-muted-foreground">
            Current policy {current.policy_no}
            {current.expires_on ? `, expires ${formatDay(current.expires_on)}` : ""}. Enter the renewed policy from the new certificate.
          </p>
        )}
        <InsuranceFields value={form} onChange={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!!missing || record.isPending} title={missing ? `Add the ${missing}` : undefined}>
            {record.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Save insurance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
