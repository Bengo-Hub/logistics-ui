"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";

export interface EarningStatement {
  id: string;
  tenant_id: string;
  fleet_member_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: "draft" | "confirmed" | "paid";
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  tenant_id: string;
  fleet_member_id: string;
  task_id: string;
  event_type: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
}

export interface PricingRule {
  id: string;
  tenant_id: string;
  name: string;
  rule_type: "flat" | "distance" | "surge";
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  surge_multiplier: number;
  min_fare: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useEarningStatements() {
  const tenantSlug = useTenantSlug();
  return useQuery<EarningStatement[]>({
    queryKey: ["earnings-statements", tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/earnings/statements`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantSlug,
  });
}

export function useBillingEvents() {
  const tenantSlug = useTenantSlug();
  return useQuery<BillingEvent[]>({
    queryKey: ["billing-events", tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/earnings/events`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantSlug,
  });
}

export function usePricingRules() {
  const tenantSlug = useTenantSlug();
  return useQuery<PricingRule[]>({
    queryKey: ["pricing-rules", tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/earnings/pricing-rules`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantSlug,
  });
}

export function useCreatePricingRule() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<PricingRule, "id" | "tenant_id" | "created_at" | "updated_at">) => {
      const { data } = await api.post(`${tenantSlug}/earnings/pricing-rules`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useUpdatePricingRule() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, ...body }: Partial<PricingRule> & { ruleId: string }) => {
      const { data } = await api.patch(`${tenantSlug}/earnings/pricing-rules/${ruleId}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useDeletePricingRule() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      await api.delete(`${tenantSlug}/earnings/pricing-rules/${ruleId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useGenerateStatements() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { period_start: string; period_end: string }) => {
      const { data } = await api.post(`${tenantSlug}/earnings/statements/generate`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["earnings-statements"] }),
  });
}
