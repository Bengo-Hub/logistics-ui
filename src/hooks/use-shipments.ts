"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  addCustodyEvent,
  createShipment,
  dispatchShipment,
  fetchCustodyEvents,
  fetchShipment,
  fetchShipments,
  updateShipmentStatus,
} from "@/lib/api/logistics";
import type { AddCustodyEventRequest, CreateShipmentRequest } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useShipments(params?: { status?: string; limit?: number }) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["shipments", tenantSlug, params],
    queryFn: () => fetchShipments(tenantSlug, params),
    enabled: !!tenantSlug,
  });
}

export function useShipment(shipmentId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["shipment", tenantSlug, shipmentId],
    queryFn: () => fetchShipment(tenantSlug, shipmentId),
    enabled: !!tenantSlug && !!shipmentId,
  });
}

export function useCreateShipment() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateShipmentRequest) => createShipment(tenantSlug, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipments"] }),
  });
}

export function useDispatchShipment() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) => dispatchShipment(tenantSlug, shipmentId),
    onSuccess: (_data, shipmentId) => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      qc.invalidateQueries({ queryKey: ["shipment", tenantSlug, shipmentId] });
    },
  });
}

export function useUpdateShipmentStatus() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, status }: { shipmentId: string; status: string }) =>
      updateShipmentStatus(tenantSlug, shipmentId, status),
    onSuccess: (_data, { shipmentId }) => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      qc.invalidateQueries({ queryKey: ["shipment", tenantSlug, shipmentId] });
    },
  });
}

export function useCustodyEvents(shipmentId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["custody", tenantSlug, shipmentId],
    queryFn: () => fetchCustodyEvents(tenantSlug, shipmentId),
    enabled: !!tenantSlug && !!shipmentId,
  });
}

export function useAddCustodyEvent() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, req }: { shipmentId: string; req: AddCustodyEventRequest }) =>
      addCustodyEvent(tenantSlug, shipmentId, req),
    onSuccess: (_data, { shipmentId }) => {
      qc.invalidateQueries({ queryKey: ["custody", tenantSlug, shipmentId] });
      qc.invalidateQueries({ queryKey: ["shipment", tenantSlug, shipmentId] });
    },
  });
}
