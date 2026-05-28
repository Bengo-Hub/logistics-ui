"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchKPIs, type KPIPeriod } from "@/lib/api/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useKPIs(period?: KPIPeriod) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["analytics-kpis", tenantSlug, period ?? "7d"],
    queryFn: () => fetchKPIs(tenantSlug, period),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000, // 5-minute cache
  });
}
