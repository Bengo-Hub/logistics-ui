"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchAuthMe, fetchModulesConfig, updateModulesConfig } from "@/lib/api/logistics";
import { useAuthStore } from "@/store/auth";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

/**
 * Returns the service-level auth/me data including enabled modules, use_case,
 * and service-specific RBAC permissions (Trinity Layer 3).
 * Stale time = 5 min; platform owners get unrestricted module access.
 */
export function useServiceAuthMe() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["service-auth-me", tenantSlug],
    queryFn: () => fetchAuthMe(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Module access hook — mirrors the TruLoad useModuleAccess pattern.
 * Reads enabled_modules from the logistics-api /auth/me response.
 * Platform owners always have access to all modules.
 */
export function useModuleAccess() {
  const { data: serviceMe } = useServiceAuthMe();
  const isPlatformOwner = useAuthStore((s) => s.user?.isPlatformOwner ?? false);

  const enabledModules: string[] = serviceMe?.enabled_modules ?? [];
  const useCase: string = serviceMe?.use_case ?? "";

  function hasModule(key: string): boolean {
    if (isPlatformOwner) return true;
    // null/empty = all modules allowed (backward compat when backend hasn't set override)
    if (!serviceMe?.enabled_modules || enabledModules.length === 0) return true;
    return enabledModules.includes(key);
  }

  return {
    hasModule,
    isPlatformOwner,
    useCase,
    enabledModules,
    isLoading: !serviceMe,
    // Convenience flags
    showDistribution: hasModule("distribution"),
    showColdChain: hasModule("cold_chain"),
    showSmartLocks: hasModule("smart_locks"),
    showPricing: hasModule("pricing"),
    showEarnings: hasModule("earnings"),
    showAnalytics: hasModule("analytics"),
    showVehicles: hasModule("vehicles"),
    showRBAC: hasModule("rbac"),
    showShifts: hasModule("shifts"),
    showReporting: hasModule("reporting"),
  };
}

/**
 * Service-level permission check from Trinity Layer 3 /auth/me.
 * These are logistics-specific permissions (e.g. logistics.tasks.manage),
 * distinct from global SSO roles.
 */
export function useMyPermissions() {
  const { data: serviceMe } = useServiceAuthMe();
  const isPlatformOwner = useAuthStore((s) => s.user?.isPlatformOwner ?? false);
  const permissions: string[] = serviceMe?.permissions ?? [];

  function hasPermission(code: string): boolean {
    if (isPlatformOwner) return true;
    return permissions.includes(code);
  }

  return { hasPermission, permissions };
}

// ─── Admin: Module Management ─────────────────────────────────────────────────

export function useModulesConfig() {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["modules-config", tenantSlug],
    queryFn: () => fetchModulesConfig(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useUpdateModules() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabledModules: string[]) =>
      updateModulesConfig(tenantSlug, enabledModules),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-auth-me"] });
      qc.invalidateQueries({ queryKey: ["modules-config"] });
    },
  });
}
