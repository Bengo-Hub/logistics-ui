"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchServiceConfig, updateServiceConfig } from "@/lib/api/logistics";
import type { ServiceConfigMap } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useServiceConfig() {
  const tenantSlug = useTenantSlug();
  return useQuery<ServiceConfigMap>({
    queryKey: ["service-config", tenantSlug],
    queryFn: () => fetchServiceConfig(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useUpdateServiceConfig() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ServiceConfigMap>) =>
      updateServiceConfig(tenantSlug, body),
    onSuccess: (data) => {
      qc.setQueryData(["service-config", tenantSlug], data);
    },
  });
}
