"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  createShift,
  deleteShift,
  endShift,
  fetchShifts,
  startShift,
  updateShiftStatus,
  type ShiftsParams,
} from "@/lib/api/logistics";
import type { CreateShiftRequest } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useShifts(params?: ShiftsParams) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["shifts", tenantSlug, params],
    queryFn: () => fetchShifts(tenantSlug, params),
    enabled: !!tenantSlug,
  });
}

export function useCreateShift() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateShiftRequest) => createShift(tenantSlug, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useUpdateShiftStatus() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, status }: { shiftId: string; status: string }) =>
      updateShiftStatus(tenantSlug, shiftId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useStartShift() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => startShift(tenantSlug, shiftId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useEndShift() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => endShift(tenantSlug, shiftId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}

export function useDeleteShift() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => deleteShift(tenantSlug, shiftId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });
}
