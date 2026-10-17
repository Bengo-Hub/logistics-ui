"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  approveMember,
  assignVehicle,
  batchInviteMembers,
  createVehicle,
  deleteMember,
  deleteVehicle,
  fetchFleet,
  fetchMember,
  fetchMembers,
  fetchVehicles,
  inviteMember,
  onboardRider,
  rejectMember,
  setMemberEmployment,
  suspendMember,
  updateVehicle,
  type Employment,
  type MembersParams,
  type OnboardRiderBody,
  type VehiclesParams,
} from "@/lib/api/logistics";
import type { CreateVehicleRequest, FleetMember, PaginatedResponse, VehicleStatus } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

const EMPTY_MEMBERS: PaginatedResponse<FleetMember> = {
  data: [],
  total: 0,
  page: 1,
  limit: 20,
  hasMore: false,
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

export function useSetMemberEmployment() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, ...body }: { memberId: string } & Employment) =>
      setMemberEmployment(tenantSlug, memberId, body),
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

// Riders and vehicles show each other, so a change to either refreshes both lists.
function invalidateFleet(qc: QueryClient) {
  for (const key of ["fleet", "fleet-members", "fleet-member", "fleet-vehicles"]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useFleetVehicles(params?: VehiclesParams, enabled = true) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["fleet-vehicles", tenantSlug, params ?? {}],
    queryFn: () => fetchVehicles(tenantSlug, params),
    enabled: !!tenantSlug && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useOnboardRider() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OnboardRiderBody) => onboardRider(tenantSlug, body),
    onSuccess: () => invalidateFleet(qc),
  });
}

export function useCreateVehicle() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVehicleRequest) => createVehicle(tenantSlug, body),
    onSuccess: () => invalidateFleet(qc),
  });
}

export function useAssignVehicle() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, vehicleId }: { memberId: string; vehicleId: string | null }) =>
      assignVehicle(tenantSlug, memberId, vehicleId),
    onSuccess: () => invalidateFleet(qc),
  });
}

export function useUpdateVehicle() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleId,
      ...body
    }: { vehicleId: string } & Partial<
      Pick<CreateVehicleRequest, "vehicle_type" | "make" | "model" | "license_plate">
    > & { status?: VehicleStatus }) => updateVehicle(tenantSlug, vehicleId, body),
    onSuccess: () => invalidateFleet(qc),
  });
}

export function useDeleteVehicle() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle(tenantSlug, vehicleId),
    onSuccess: () => invalidateFleet(qc),
  });
}
