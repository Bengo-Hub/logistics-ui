"use client";

import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/base";
import { DeliveryPricingCard } from "@/components/zones/delivery-pricing-card";
import { useModuleAccess } from "@/hooks/use-module-access";

/**
 * Platform administration: the platform default of the delivery quote policy, edited with the
 * same card tenants use on their Delivery areas page. There is one pricing rule on the
 * platform (logistics.delivery_quote_policy); a tenant's own copy, when saved, wins over this
 * default. Rider pay is a separate thing (Earnings, pricing rules).
 */
export default function PlatformPage() {
  const { isPlatformOwner } = useModuleAccess();

  if (!isPlatformOwner) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto size-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Access restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">This page is only for platform administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform administration</h1>
          <p className="text-sm text-muted-foreground">Defaults for every tenant that has not set its own.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Shield className="size-3" /> Platform admin
        </Badge>
      </div>
      <DeliveryPricingCard canManage scope="platform" />
    </div>
  );
}
