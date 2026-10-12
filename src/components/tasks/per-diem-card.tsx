"use client";

import { useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { PermissionGate } from "@/components/ui/module-gate";
import { useRaisePerDiem } from "@/hooks/use-tasks";
import type { PerDiemClaim } from "@/lib/api/logistics";

// Per diem for a staff rider's trip is an HR (erp-api) expense claim. Logistics raises it when
// the trip completes and keeps the outcome on the task; dispatchers can raise it again here,
// with the days for a multi-day trip. Freelance trips never carry a claim, so no card.

const STATE: Record<PerDiemClaim["status"], { label: string; variant: "success" | "warning" | "destructive" }> = {
  raised: { label: "Sent to HR", variant: "success" },
  skipped: { label: "Not eligible", variant: "warning" },
  failed: { label: "HR unreachable", variant: "destructive" },
};

export function PerDiemCard({ taskId, claim }: { taskId: string; claim: PerDiemClaim }) {
  const raise = useRaisePerDiem();
  const [days, setDays] = useState("");
  const state = STATE[claim.status] ?? STATE.failed;

  const submit = async () => {
    try {
      const res = await raise.mutateAsync({ taskId, days: Number(days) || 0 });
      if (res.status === "raised") toast.success("Per diem sent to HR");
      else toast.info(res.message || "HR did not accept this trip for per diem");
      setDays("");
    } catch (e) {
      toast.error((e as { response?: { data?: string } })?.response?.data || "Could not raise per diem");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="size-4 text-primary" /> Staff rider per diem
          <Badge variant={state.variant} className="ml-auto">
            {state.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          {claim.amount && (
            <>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium">KES {claim.amount}</dd>
            </>
          )}
          {claim.days ? (
            <>
              <dt className="text-muted-foreground">Days</dt>
              <dd className="font-medium">{claim.days}</dd>
            </>
          ) : null}
          {claim.updated_at && (
            <>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{new Date(claim.updated_at).toLocaleString()}</dd>
            </>
          )}
        </dl>
        {claim.message && <p className="text-muted-foreground">{claim.message}</p>}
        <p className="text-xs text-muted-foreground">HR sets the rate and approves the claim in payroll.</p>
        <PermissionGate permission="logistics.tasks.manage">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={60}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Days (blank: HR counts)"
              className="max-w-48"
            />
            <Button variant="outline" onClick={submit} disabled={raise.isPending}>
              {raise.isPending && <Loader2 className="size-4 animate-spin" />}
              {claim.status === "raised" ? "Update days" : "Raise again"}
            </Button>
          </div>
        </PermissionGate>
      </CardContent>
    </Card>
  );
}
