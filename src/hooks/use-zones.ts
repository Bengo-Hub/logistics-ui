"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  createZone,
  deleteZone,
  fetchDeliveryCoverage,
  fetchDeliveryPolicy,
  fetchDeliveryQuote,
  fetchFeeSuggestion,
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
import { useOutletFilterStore } from "@/store/outlet-filter";
import type { DeliveryPolicy, ZoneInput } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

/** Everything derived from zones or the policy refreshes together after a change. */
function useInvalidateDelivery() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["zones", "zone", "delivery-coverage", "delivery-quote", "delivery-policy", "fee-suggestion"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

/** The outlet the user switched to in the header, "" for every branch. */
function useSelectedOutletId(): string {
  return useOutletFilterStore((s) => s.selectedOutlet?.id ?? "");
}

/** Areas of the tenant that serve the selected outlet (every area when "All Branches"). */
export function useZones() {
  const tenantSlug = useTenantSlug();
  const outletId = useSelectedOutletId();
  return useQuery({
    queryKey: ["zones", tenantSlug, outletId],
    queryFn: () => fetchZones(tenantSlug, outletId || undefined),
    enabled: !!tenantSlug,
    placeholderData: keepPreviousData,
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
  const outletId = useSelectedOutletId();
  return useQuery({
    queryKey: ["delivery-coverage", tenantSlug, outletId],
    queryFn: () => fetchDeliveryCoverage(tenantSlug, outletId || undefined),
    enabled: !!tenantSlug,
    placeholderData: keepPreviousData,
  });
}

/**
 * The delivery fee the tenant's own per-km rules give for an area centred here, measured from
 * the selected outlet (else the nearest outlet with a map pin). Used to fill a new area's fee.
 */
export function useFeeSuggestion(center: { lat: number; lng: number } | null, radiusM: number) {
  const tenantSlug = useTenantSlug();
  const outletId = useSelectedOutletId();
  // About 11 m and 10 m steps: dragging a circle does not ask for a new price on every pixel.
  const lat = center ? Number(center.lat.toFixed(4)) : null;
  const lng = center ? Number(center.lng.toFixed(4)) : null;
  const radius = Math.round(radiusM / 10) * 10;
  return useQuery({
    queryKey: ["fee-suggestion", tenantSlug, outletId, lat, lng, radius],
    queryFn: () => fetchFeeSuggestion(tenantSlug, { lat: lat!, lng: lng!, radius_m: radius, outlet_id: outletId || undefined }),
    enabled: !!tenantSlug && lat !== null && lng !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
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
