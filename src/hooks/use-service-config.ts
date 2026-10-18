"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchServiceConfig, fetchSettingRows, resetSetting, saveSetting, updateServiceConfig } from "@/lib/api/logistics";
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
      qc.invalidateQueries({ queryKey: ["setting-rows", tenantSlug] });
    },
  });
}

/** The raw settings rows, with which ones are the tenant's own value and the platform default. */
export function useSettingRows() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["setting-rows", tenantSlug],
    queryFn: () => fetchSettingRows(tenantSlug),
    enabled: !!tenantSlug,
  });
}

/** Saves the tenant's own value (value) or returns the key to the platform default (value null). */
export function useSetSetting() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string | null }) =>
      value === null ? resetSetting(tenantSlug, key) : saveSetting(tenantSlug, key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setting-rows", tenantSlug] });
      qc.invalidateQueries({ queryKey: ["service-config", tenantSlug] });
      qc.invalidateQueries({ queryKey: ["fleet-members"] });
      qc.invalidateQueries({ queryKey: ["fleet-vehicles"] });
    },
  });
}
