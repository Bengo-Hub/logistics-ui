"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  createZone,
  deleteZone,
  fetchZone,
  fetchZones,
  updateZone,
} from "@/lib/api/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useZones() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["zones", tenantSlug],
    queryFn: () => fetchZones(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useZone(zoneId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["zone", tenantSlug, zoneId],
    queryFn: () => fetchZone(tenantSlug, zoneId),
    enabled: !!tenantSlug && !!zoneId,
  });
}

export function useCreateZone() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createZone>[1]) => createZone(tenantSlug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useUpdateZone() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      zoneId,
      ...body
    }: { zoneId: string } & Parameters<typeof updateZone>[2]) =>
      updateZone(tenantSlug, zoneId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useDeleteZone() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (zoneId: string) => deleteZone(tenantSlug, zoneId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}
