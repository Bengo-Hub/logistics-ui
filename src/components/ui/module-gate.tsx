"use client";

import type { ReactNode } from "react";
import { useModuleAccess, useMyPermissions } from "@/hooks/use-module-access";

interface ModuleGateProps {
  moduleKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the tenant has the specified module enabled.
 * Platform owners bypass all module checks.
 */
export function ModuleGate({ moduleKey, children, fallback = null }: ModuleGateProps) {
  const { hasModule } = useModuleAccess();
  if (!hasModule(moduleKey)) return <>{fallback}</>;
  return <>{children}</>;
}

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the user has the specified logistics permission.
 * Platform owners bypass all permission checks.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useMyPermissions();
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
