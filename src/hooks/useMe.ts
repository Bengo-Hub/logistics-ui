"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

/** Auth-api GET /me response: user profile with role(s) and permissions (source of truth for RBAC). */
export interface MeResponse {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  tenantId?: string;
  tenantSlug?: string;
  /** Single role (legacy) or first role. */
  role?: string;
  /** All roles from auth-api. */
  roles?: string[];
  permissions: string[];
  [key: string]: unknown;
}

const ME_QUERY_KEY = ["auth", "me"] as const;
const ME_STALE_MS = 5 * 60 * 1000; // 5 min TTL

async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("auth/me");
  return {
    ...data,
    roles: Array.isArray(data.roles) ? data.roles : data.role ? [data.role] : [],
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
  };
}

/** Load current user and RBAC (roles/permissions) from auth-api GET /me with TanStack Query and TTL. */
export function useMe(enabled = true) {
  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled,
    staleTime: ME_STALE_MS,
    gcTime: ME_STALE_MS * 2,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const user = query.data ?? null;
  const roles = user?.roles ?? (user?.role ? [user.role] : []) as string[];
  const permissions = (user?.permissions ?? []) as string[];

  const hasRole = (role: string) => {
    if (!roles.length) return false;
    return roles.includes(role) || roles.includes("super_admin") || roles.includes("admin");
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (roles.includes("super_admin") || roles.includes("admin")) return true;
    return permissions.includes(permission);
  };

  return {
    ...query,
    user,
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
  };
}

export function useHasRole(role: string): boolean {
  const { hasRole } = useMe();
  return hasRole(role);
}

export function useHasPermission(permission: string): boolean {
  const { hasPermission } = useMe();
  return hasPermission(permission);
}

export function useIsSuperAdmin(): boolean {
  return useHasRole("super_admin");
}
