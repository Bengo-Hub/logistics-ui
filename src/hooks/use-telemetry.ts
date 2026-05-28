"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchTelemetry } from "@/lib/api/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useTelemetry(params?: { period?: string; fleet_member_id?: string }) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["telemetry", tenantSlug, params],
    queryFn: () => fetchTelemetry(tenantSlug, params),
    enabled: !!tenantSlug,
    refetchInterval: 60_000,
  });
}
