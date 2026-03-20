"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import type {
  Fleet,
  FleetMember,
  Task,
  TaskStatus,
  TrackingInfo,
} from "@/types/logistics";

// ─── Fleet & Riders ───────────────────────────────────────────────

export function useFleet() {
  const tenantSlug = useTenantSlug();
  return useQuery<Fleet>({
    queryKey: ["fleet", tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/fleet`);
      return data;
    },
    enabled: !!tenantSlug,
  });
}

export function useFleetMembers(status?: string) {
  const tenantSlug = useTenantSlug();
  return useQuery<FleetMember[]>({
    queryKey: ["fleet-members", tenantSlug, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const { data } = await api.get(`${tenantSlug}/fleet/members${params}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantSlug,
  });
}

export function useFleetMember(memberId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery<FleetMember>({
    queryKey: ["fleet-member", tenantSlug, memberId],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/fleet/members/${memberId}`);
      return data;
    },
    enabled: !!tenantSlug && !!memberId,
  });
}

export function useInviteMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      role?: string;
    }) => {
      const { data } = await api.post(`${tenantSlug}/fleet/members`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useApproveMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data } = await api.post(`${tenantSlug}/fleet/members/${memberId}/approve`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useSuspendMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data } = await api.post(`${tenantSlug}/fleet/members/${memberId}/suspend`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

// ─── Tasks ────────────────────────────────────────────────────────

export function useTasks(status?: TaskStatus | "all") {
  const tenantSlug = useTenantSlug();
  return useQuery<Task[]>({
    queryKey: ["tasks", tenantSlug, status],
    queryFn: async () => {
      const params = status && status !== "all" ? `?status=${status}` : "";
      const { data } = await api.get(`${tenantSlug}/tasks${params}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantSlug,
    refetchInterval: 15_000,
  });
}

export function useTask(taskId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery<Task>({
    queryKey: ["task", tenantSlug, taskId],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/tasks/${taskId}`);
      return data;
    },
    enabled: !!tenantSlug && !!taskId,
    refetchInterval: 10_000,
  });
}

export function useCreateTask() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      external_reference?: string;
      source_service?: string;
      task_type?: string;
      priority?: number;
      metadata?: Record<string, unknown>;
    }) => {
      const { data } = await api.post(`${tenantSlug}/tasks`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTaskStatus() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { data } = await api.patch(`${tenantSlug}/tasks/${taskId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

export function useAssignTask() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, fleetMemberId }: { taskId: string; fleetMemberId: string }) => {
      const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/assign`, {
        fleet_member_id: fleetMemberId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

// ─── Zones ────────────────────────────────────────────────────────

export interface GeoFence {
  id: string;
  tenant_id: string;
  name: string;
  zone_type: string;
  status: string;
  boundary: number[][];
  color: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useZones() {
  const tenantSlug = useTenantSlug();
  return useQuery<GeoFence[]>({
    queryKey: ["zones", tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`${tenantSlug}/zones`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantSlug,
  });
}

export function useCreateZone() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      zone_type?: string;
      status?: string;
      boundary: number[][];
      color?: string;
    }) => {
      const { data } = await api.post(`${tenantSlug}/zones`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useUpdateZone() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ zoneId, ...body }: {
      zoneId: string;
      name?: string;
      zone_type?: string;
      status?: string;
      boundary?: number[][];
      color?: string;
    }) => {
      const { data } = await api.patch(`${tenantSlug}/zones/${zoneId}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useDeleteZone() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (zoneId: string) => {
      await api.delete(`${tenantSlug}/zones/${zoneId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

// ─── Public Tracking ──────────────────────────────────────────────

export function usePublicTracking(trackingCode: string) {
  return useQuery<TrackingInfo>({
    queryKey: ["tracking", trackingCode],
    queryFn: async () => {
      const baseUrl = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
      const { data } = await api.get(`${baseUrl}/track/${trackingCode}`);
      return data;
    },
    enabled: !!trackingCode,
    refetchInterval: 10_000,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}
