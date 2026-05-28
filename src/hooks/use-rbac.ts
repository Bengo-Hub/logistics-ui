"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  assignRoleToUser,
  fetchPermissions,
  fetchRole,
  fetchRoles,
  fetchUserAssignments,
  revokeRoleFromUser,
} from "@/lib/api/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useRoles() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["rbac-roles", tenantSlug],
    queryFn: () => fetchRoles(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useRole(roleId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["rbac-role", tenantSlug, roleId],
    queryFn: () => fetchRole(tenantSlug, roleId),
    enabled: !!tenantSlug && !!roleId,
  });
}

export function usePermissions() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["rbac-permissions", tenantSlug],
    queryFn: () => fetchPermissions(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useUserAssignments(userId?: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["rbac-assignments", tenantSlug, userId],
    queryFn: () => fetchUserAssignments(tenantSlug, userId),
    enabled: !!tenantSlug,
  });
}

export function useAssignRole() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRoleToUser(tenantSlug, userId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rbac-assignments"] }),
  });
}

export function useRevokeRole() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      revokeRoleFromUser(tenantSlug, userId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rbac-assignments"] }),
  });
}
