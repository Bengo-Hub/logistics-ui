"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  assignRoleToUser,
  fetchPermissions,
  fetchRoles,
  fetchUserAssignments,
  revokeAssignment,
} from "@/lib/api/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

function useInvalidateRbac() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["rbac-assignments"] });
    qc.invalidateQueries({ queryKey: ["rbac-roles"] });
  };
}

export function useRoles() {
  const tenantSlug = useTenantSlug();
  return useQuery({ queryKey: ["rbac-roles", tenantSlug], queryFn: () => fetchRoles(tenantSlug), enabled: !!tenantSlug });
}

export function usePermissions() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["rbac-permissions", tenantSlug],
    queryFn: () => fetchPermissions(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUserAssignments(enabled = true, userId?: string) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["rbac-assignments", tenantSlug, userId],
    queryFn: () => fetchUserAssignments(tenantSlug, userId),
    enabled: enabled && !!tenantSlug,
  });
}

export function useAssignRole() {
  const tenantSlug = useTenantSlug();
  const invalidate = useInvalidateRbac();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => assignRoleToUser(tenantSlug, userId, roleId),
    onSuccess: invalidate,
  });
}

export function useRevokeRole() {
  const tenantSlug = useTenantSlug();
  const invalidate = useInvalidateRbac();
  return useMutation({
    mutationFn: (assignmentId: string) => revokeAssignment(tenantSlug, assignmentId),
    onSuccess: invalidate,
  });
}
