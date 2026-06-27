"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Platform separation guard (see plan: platform-owner-self-tenant-separation).
 *
 * Model = "Dedicated Platform section": the main app is the platform owner's OWN
 * business (own-tenant scope by default); any cross-tenant drill-in is confined to
 * `/platform/*`. logistics-ui has NO `?tenantId=` drill-in today — the platform
 * page (`/platform`) only renders system-wide config. The one cross-tenant lever is
 * the `is_platform_owner` localStorage flag that the apiClient (`src/lib/api/client.ts`)
 * reads to SUPPRESS the own-tenant `X-Tenant-ID` / `X-Tenant-Slug` headers (so the
 * backend returns aggregate/all-tenant data). Nothing sets it to "true" today, so it
 * is latent — but if it were ever set globally it would leak cross-tenant data into
 * normal business pages.
 *
 * This is a defensive belt-and-suspenders: whenever the route is NOT under
 * `/platform`, clear the suppression flag so business pages always carry the owner's
 * own X-Tenant-ID / X-Tenant-Slug and scope to their own tenant. If a real platform
 * drill-in is ever added, it must set `is_platform_owner` only while on `/platform` —
 * this effect still clears it on the way out.
 */
export function PlatformScopeGuard() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (/\/platform(\/|$)/.test(pathname)) return;
    if (localStorage.getItem("is_platform_owner") === "true") {
      localStorage.removeItem("is_platform_owner");
    }
  }, [pathname]);

  return null;
}
