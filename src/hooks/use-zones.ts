"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  createZone,
  deleteZone,
  fetchDeliveryCoverage,
  fetchDeliveryPolicy,
  fetchDeliveryQuote,
  fetchZone,
  fetchZones,
  fetchZoneStats,
  reversePlace,
  saveDeliveryPolicy,
  searchPlaces,
  updateZone,
  fetchPlatformDeliveryPolicy,
  resetDeliveryPolicy,
  savePlatformDeliveryPolicy,
} from "@/lib/api/logistics";
import type { DeliveryPolicy, ZoneInput } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

/** Everything derived from zones or the policy refreshes together after a change. */
function useInvalidateDelivery() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["zones", "zone", "delivery-coverage", "delivery-quote", "delivery-policy"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
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
  const invalidate = useInvalidateDelivery();
  return useMutation({
    mutationFn: (body: ZoneInput) => createZone(tenantSlug, body),
    onSuccess: invalidate,
  });
}

export function useUpdateZone() {
  const tenantSlug = useTenantSlug();
  const invalidate = useInvalidateDelivery();
  return useMutation({
    mutationFn: ({ zoneId, ...body }: { zoneId: string } & Partial<ZoneInput>) => updateZone(tenantSlug, zoneId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteZone() {
  const tenantSlug = useTenantSlug();
  const invalidate = useInvalidateDelivery();
  return useMutation({
    mutationFn: (zoneId: string) => deleteZone(tenantSlug, zoneId),
    onSuccess: invalidate,
  });
}

export function useDeliveryPolicy(enabled = true) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["delivery-policy", tenantSlug],
    queryFn: () => fetchDeliveryPolicy(tenantSlug),
    enabled: enabled && !!tenantSlug,
  });
}

export function useSaveDeliveryPolicy() {
  const tenantSlug = useTenantSlug();
  const invalidate = useInvalidateDelivery();
  return useMutation({
    mutationFn: (policy: DeliveryPolicy) => saveDeliveryPolicy(tenantSlug, policy),
    onSuccess: invalidate,
  });
}

export function useResetDeliveryPolicy() {
  const tenantSlug = useTenantSlug();
  const invalidate = useInvalidateDelivery();
  return useMutation({
    mutationFn: () => resetDeliveryPolicy(tenantSlug),
    onSuccess: invalidate,
  });
}

/** The platform default policy (platform owners only). */
export function usePlatformDeliveryPolicy(enabled = true) {
  return useQuery({
    queryKey: ["delivery-policy", "platform"],
    queryFn: fetchPlatformDeliveryPolicy,
    enabled,
  });
}

export function useSavePlatformDeliveryPolicy() {
  const invalidate = useInvalidateDelivery();
  return useMutation({
    mutationFn: (policy: DeliveryPolicy) => savePlatformDeliveryPolicy(policy),
    onSuccess: invalidate,
  });
}

/** Outlet pins and active areas (the same view customers get). */
export function useDeliveryCoverage() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["delivery-coverage", tenantSlug],
    queryFn: () => fetchDeliveryCoverage(tenantSlug),
    enabled: !!tenantSlug,
  });
}

/** Live quote for a point (quote tester). */
export function useDeliveryQuote(point: { lat: number; lng: number } | null, outletId?: string, orderTotal?: number) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["delivery-quote", tenantSlug, point?.lat, point?.lng, outletId, orderTotal],
    queryFn: () => fetchDeliveryQuote(tenantSlug, { lat: point!.lat, lng: point!.lng, outlet_id: outletId || undefined, order_total: orderTotal || undefined }),
    enabled: !!tenantSlug && !!point,
    placeholderData: keepPreviousData,
  });
}

export function usePlaceSearch(q: string) {
  const tenantSlug = useTenantSlug();
  const term = q.trim();
  return useQuery({
    queryKey: ["place-search", tenantSlug, term],
    queryFn: () => searchPlaces(tenantSlug, term),
    enabled: !!tenantSlug && term.length >= 3,
    staleTime: 5 * 60_000,
  });
}

export function useReversePlace(point: { lat: number; lng: number } | null) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["place-reverse", tenantSlug, point ? point.lat.toFixed(4) : null, point ? point.lng.toFixed(4) : null],
    queryFn: () => reversePlace(tenantSlug, point!.lat, point!.lng),
    enabled: !!tenantSlug && !!point,
    staleTime: 10 * 60_000,
  });
}

export function useZoneStats(period: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["zone-stats", tenantSlug, period],
    queryFn: () => fetchZoneStats(tenantSlug, period),
    enabled: !!tenantSlug,
  });
}
