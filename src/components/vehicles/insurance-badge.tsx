"use client";

import { ShieldAlert, ShieldCheck, ShieldOff, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/base";
import type { InsuranceView } from "@/types/logistics";

/** Short label for a vehicle's insurance status. */
export function insuranceLabel(view?: InsuranceView): string {
  if (!view) return "";
  const days = view.days_left ?? 0;
  switch (view.status) {
    case "valid":
      return `Insured until ${formatDay(view.expires_on)}`;
    case "expiring":
      return days <= 0 ? "Insurance expires today" : `Insurance expires in ${days} day${days === 1 ? "" : "s"}`;
    case "expired":
      return `Insurance expired ${formatDay(view.expires_on)}`;
    case "missing":
      return "No insurance recorded";
    default:
      return "Insurance not required";
  }
}

/** "2027-03-24" as "24 Mar 2027". */
export function formatDay(day?: string): string {
  if (!day) return "";
  const d = new Date(`${day}T00:00:00`);
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

const TONE = {
  valid: { variant: "success", Icon: ShieldCheck },
  expiring: { variant: "warning", Icon: ShieldAlert },
  expired: { variant: "destructive", Icon: ShieldOff },
  missing: { variant: "destructive", Icon: ShieldQuestion },
  not_required: { variant: "secondary", Icon: ShieldCheck },
} as const;

/** A vehicle's insurance status. A missing policy is shown as a problem only when it blocks jobs. */
export function InsuranceBadge({ view, className }: { view?: InsuranceView; className?: string }) {
  if (!view) return null;
  const tone = TONE[view.status] ?? TONE.not_required;
  const variant = view.status === "missing" && !view.block ? "warning" : tone.variant;
  return (
    <Badge variant={variant} className={`gap-1 text-[10px] ${className ?? ""}`}>
      <tone.Icon className="size-3" />
      {insuranceLabel(view)}
    </Badge>
  );
}
