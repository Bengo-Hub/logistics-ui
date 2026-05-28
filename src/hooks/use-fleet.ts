"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  approveMember,
  assignVehicle,
  batchInviteMembers,
  createVehicle,
  deleteMember,
  fetchFleet,
  fetchMember,
  fetchMembers,
  inviteMember,
  rejectMember,
  suspendMember,
  type MembersParams,
} from "@/lib/api/logistics";
import type { CreateVehicleRequest, FleetMember, PaginatedResponse } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

const EMPTY_MEMBERS: PaginatedResponse<FleetMember> = {
  data: [],
  total: 0,
  page: 1,
  limit: 20,
  has_more: false,
};

export function useFleet() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["fleet", tenantSlug],
    queryFn: () => fetchFleet(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useFleetMembers(params?: MembersParams | string) {
  const tenantSlug = useTenantSlug();
  const normalizedParams: MembersParams =
    typeof params === "string" ? { status: params } : (params ?? {});
  return useQuery({
    queryKey: ["fleet-members", tenantSlug, normalizedParams],
    queryFn: () => fetchMembers(tenantSlug, normalizedParams),
    enabled: !!tenantSlug,
    placeholderData: EMPTY_MEMBERS,
  });
}

export function useFleetMember(memberId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["fleet-member", tenantSlug, memberId],
    queryFn: () => fetchMember(tenantSlug, memberId),
    enabled: !!tenantSlug && !!memberId,
  });
}

export function useInviteMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof inviteMember>[1]) =>
      inviteMember(tenantSlug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useApproveMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => approveMember(tenantSlug, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useSuspendMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => suspendMember(tenantSlug, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useRejectMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, reason }: { memberId: string; reason?: string }) =>
      rejectMember(tenantSlug, memberId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useDeleteMember() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => deleteMember(tenantSlug, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useBatchInviteMembers() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (members: Parameters<typeof batchInviteMembers>[1]) =>
      batchInviteMembers(tenantSlug, members),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-members"] }),
  });
}

export function useCreateVehicle() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVehicleRequest) => createVehicle(tenantSlug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fleet"] });
      qc.invalidateQueries({ queryKey: ["fleet-members"] });
    },
  });
}

export function useAssignVehicle() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, vehicleId }: { memberId: string; vehicleId: string }) =>
      assignVehicle(tenantSlug, memberId, vehicleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fleet-members"] });
      qc.invalidateQueries({ queryKey: ["fleet-member"] });
    },
  });
}
