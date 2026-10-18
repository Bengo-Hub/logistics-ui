/**
 * Server-side identity of this tenant's logistics app (name, home-screen label, icon, theme) for
 * page metadata, the PWA manifest and the generated app icons ([orgSlug]/app-icon/[size]).
 *
 * Source: auth-api's public tenant record, through the shared rule resolveAppIdentity
 * (shared-ui-lib branding): the tenant's own logistics app branding (metadata
 * service_branding.logistics, set in Accounts > Branding > App names and icons) wins, else
 * "<Business> Logistics" with the business logo.
 */

import { resolveAppIdentity, type AppIdentity, type PublicTenantBranding } from "@bengo-hub/shared-ui-lib/branding";

export { appIconPath } from "@bengo-hub/shared-ui-lib/app-icon";

const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_SSO_URL || process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexafrica.com";

/** The logistics mark's colours (public/icons/logistics-icon.svg). */
export const DEFAULT_THEME_COLOR = "#5B1C4D";
export const DEFAULT_BACKGROUND_COLOR = "#1a0a15";

async function fetchTenant(slug: string): Promise<PublicTenantBranding | null> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicTenantBranding;
  } catch {
    return null;
  }
}

export async function getAppBranding(slug: string): Promise<AppIdentity> {
  return resolveAppIdentity(await fetchTenant(slug), {
    slug,
    service: "logistics",
    label: "Logistics",
    defaultThemeColor: DEFAULT_THEME_COLOR,
    defaultBackgroundColor: DEFAULT_BACKGROUND_COLOR,
    defaultDescription: (business) => `Deliveries, riders and routes for ${business}.`,
  });
}
