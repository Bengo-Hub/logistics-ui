"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PermissionGate } from "@/components/ui/module-gate";
import { useUpdateMemberDetails } from "@/hooks/use-fleet";
import type { MemberDetails } from "@/lib/api/logistics";
import { apiErrorText } from "@/lib/utils";
import type { FleetMember } from "@/types/logistics";

/**
 * Lets a fleet manager correct a rider's phone, ID number and licence number. Name and email come
 * from the rider's own account and are changed there. Saving never sends the rider back to review.
 */
export function RiderDetailsEditor({ member }: { member: FleetMember }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const save = useUpdateMemberDetails();

  const start = () => {
    setPhone(member.phone ?? "");
    setIdNumber(member.id_passport_number ?? "");
    setLicenseNo(member.license_no ?? "");
    setOpen(true);
  };

  const submit = () => {
    // Only what changed is sent, so an untouched field is never overwritten.
    const body: MemberDetails = {};
    if (phone.trim() !== (member.phone ?? "")) body.phone = phone.trim();
    if (idNumber.trim() !== (member.id_passport_number ?? "")) body.id_number = idNumber.trim();
    if (licenseNo.trim() !== (member.license_no ?? "")) body.license_no = licenseNo.trim();
    if (Object.keys(body).length === 0) {
      setOpen(false);
      return;
    }
    save.mutate(
      { memberId: member.id, ...body },
      {
        onSuccess: () => {
          toast.success("Rider details saved");
          setOpen(false);
        },
        onError: (err) => toast.error(apiErrorText(err, "Could not save the rider's details")),
      },
    );
  };

  return (
    <PermissionGate permission="logistics.fleet.manage">
      <Button size="sm" variant="outline" onClick={start}>
        <Pencil className="size-3.5" /> Edit details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {member.first_name} {member.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Phone</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" inputMode="tel" />
              <span className="block text-xs text-muted-foreground">
                Customers see it once the rider has their delivery, and dispatchers call it.
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">ID or passport number</span>
              <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Driving licence number</span>
              <Input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
            </label>
            <p className="text-xs text-muted-foreground">
              Name and email belong to the rider&apos;s account and are changed from their profile.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}
