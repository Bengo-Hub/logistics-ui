"use client";

import { toast } from "sonner";
import { Badge, Button } from "@/components/ui/base";
import { PermissionGate } from "@/components/ui/module-gate";
import { useSetMemberEmployment } from "@/hooks/use-fleet";
import { memberEmployment, PAY_BASIS_LABEL, type PayBasis } from "@/lib/api/logistics";
import { apiErrorText } from "@/lib/utils";
import type { FleetMember } from "@/types/logistics";

/**
 * Engagement and pay basis of one rider. Freelance riders are external and always paid per
 * delivery. Internal (staff) riders are paid by payroll or per delivery; that choice is the pay
 * basis. Shown on the riders sheet and the rider detail page.
 */
export function EmploymentControl({ member }: { member: FleetMember }) {
  const setEmployment = useSetMemberEmployment();
  const { type, pay_basis } = memberEmployment(member);
  const staff = type === "staff";

  const save = (body: { type: "freelance" | "staff"; pay_basis?: PayBasis }, message: string) =>
    setEmployment.mutate(
      { memberId: member.id, ...body },
      {
        onSuccess: () => toast.success(message),
        onError: (err) => toast.error(apiErrorText(err, "Could not change how this rider is engaged")),
      },
    );

  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={staff ? "secondary" : "success"}>{staff ? "Internal rider" : "Freelance"}</Badge>
        <Badge variant="outline">{PAY_BASIS_LABEL[pay_basis]}</Badge>
      </div>
      <PermissionGate permission="logistics.fleet.manage">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={setEmployment.isPending}
            onClick={() =>
              staff
                ? save({ type: "freelance" }, "Marked as freelance")
                : save({ type: "staff", pay_basis: "payroll" }, "Marked as internal, paid by payroll")
            }
          >
            {staff ? "Make freelance" : "Make internal"}
          </Button>
          {staff && (
            <Button
              size="sm"
              variant="ghost"
              disabled={setEmployment.isPending}
              onClick={() => {
                const next: PayBasis = pay_basis === "payroll" ? "earning_rules" : "payroll";
                save({ type: "staff", pay_basis: next }, `Now paid: ${PAY_BASIS_LABEL[next].toLowerCase()}`);
              }}
            >
              {pay_basis === "payroll" ? "Pay per delivery instead" : "Pay by payroll instead"}
            </Button>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
