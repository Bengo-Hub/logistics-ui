"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchKPIs, fetchRiderStats, fetchSeries, type KPIPeriod } from "@/lib/api/logistics";

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
    placeholderData: keepPreviousData,
  });
}

/** Task outcomes per hour (today) or per day. */
export function useSeries(period: KPIPeriod) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["analytics-series", tenantSlug, period],
    queryFn: () => fetchSeries(tenantSlug, period),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/** Per-rider performance for the period. */
export function useRiderStats(period: KPIPeriod) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["analytics-riders", tenantSlug, period],
    queryFn: () => fetchRiderStats(tenantSlug, period),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
