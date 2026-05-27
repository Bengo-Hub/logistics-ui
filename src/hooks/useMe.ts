"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { fetchProfile } from "@/lib/auth/api";
import type { UserProfile } from "@/lib/auth/types";

export type MeResponse = UserProfile & { [key: string]: unknown };

const ME_QUERY_KEY = ["auth", "me"] as const;
const ME_STALE_MS = 5 * 60 * 1000; // 5 min TTL

async function fetchMe(accessToken: string): Promise<MeResponse> {
  const res = await fetchProfile(accessToken);
  return res.user as MeResponse;
}

/** Load current user and RBAC (roles/permissions) from SSO auth-api GET /api/v1/auth/me. */
export function useMe(enabled = true) {
  const accessToken = useAuthStore((s) => s.session?.accessToken);
  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => fetchMe(accessToken!),
    enabled: enabled && !!accessToken,
    staleTime: ME_STALE_MS,
    gcTime: ME_STALE_MS * 2,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const user = query.data ?? null;
  const roles = (user?.roles ?? (user?.role ? [user.role] : [])) as string[];
  const permissions = (user?.permissions ?? []) as string[];

  const hasRole = (role: string) => {
    if (!roles.length) return false;
    return roles.includes(role) || roles.includes("superuser") || roles.includes("admin");
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (roles.includes("superuser") || roles.includes("admin")) return true;
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
  return useHasRole("superuser");
}
