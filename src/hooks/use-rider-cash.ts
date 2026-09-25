"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";

/** One cash-on-delivery drop-off whose cash the rider still holds. */
export interface CashDelivery {
  pod_id: string;
  task_id: string;
  order_number?: string;
  amount: number;
  delivered_at: string;
}

export interface RiderCash {
  fleet_member_id: string;
  rider_name?: string;
  rider_phone?: string;
  held: number;
  deliveries: CashDelivery[];
  oldest_at?: string;
}

export interface Remittance {
  id: string;
  fleet_member_id: string;
  deliveries: number;
  expected: number;
  received: number;
  shortfall: number;
  received_by?: string;
  at: string;
}

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

/** Riders still holding delivery cash, most first (GET /cash/riders). */
export function useCashWithRiders() {
  const tenantSlug = useTenantSlug();
  return useQuery<{ data: RiderCash[]; total_held: number }>({
    queryKey: ["rider-cash", tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/cash/riders`);
      return { data: Array.isArray(data?.data) ? data.data : [], total_held: Number(data?.total_held ?? 0) };
    },
    enabled: !!tenantSlug,
    refetchInterval: 60_000,
  });
}

/** Record a rider handing in their delivery cash; returns expected/received/shortfall. */
export function useRecordRemittance() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, amountReceived, notes }: { memberId: string; amountReceived: number; notes?: string }) => {
      const { data } = await api.post<Remittance>(`${tenantSlug}/cash/riders/${memberId}/remit`, {
        amount_received: amountReceived,
        notes,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rider-cash"] }),
  });
}
