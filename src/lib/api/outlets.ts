/**
 * Outlets live in auth-api, their owner. logistics mirrors them (with their map pins) for
 * quotes and dispatch, so the outlet list and every pin change go to auth-api; the mirror is
 * refreshed straight after (see refreshOutlets in lib/api/logistics.ts).
 */

import type { TenantOutlet } from "@/types/logistics";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  "https://sso.codevertexafrica.com";

function headers(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "application/json" };
}

/** Every outlet of the tenant that has not been archived, with its map pin when set. */
export async function fetchTenantOutlets(accessToken: string, tenantSlug: string): Promise<TenantOutlet[]> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/${encodeURIComponent(tenantSlug)}/outlets`, {
    headers: headers(accessToken),
  });
  if (!res.ok) throw new Error(`Could not load outlets (${res.status})`);
  const data = await res.json();
  const list: TenantOutlet[] = Array.isArray(data) ? data : data?.outlets ?? data?.data ?? [];
  return list.filter((o) => o?.id && o.status !== "archived");
}

/**
 * Sets an outlet's map pin. auth-api's update replaces the outlet's name, use case, status and
 * HQ flag with what it is sent (a missing is_hq would demote the main outlet), so the outlet's
 * current values are sent back with the new pin.
 */
export async function saveOutletPin(
  accessToken: string,
  tenantSlug: string,
  outlet: TenantOutlet,
  pin: { latitude: number; longitude: number },
): Promise<void> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/${encodeURIComponent(tenantSlug)}/outlets/${outlet.id}`, {
    method: "PUT",
    headers: headers(accessToken),
    body: JSON.stringify({
      name: outlet.name,
      use_case: outlet.use_case ?? "",
      status: outlet.status ?? "active",
      is_hq: !!outlet.is_hq,
      ...(outlet.address ? { address: outlet.address } : {}),
      latitude: pin.latitude,
      longitude: pin.longitude,
    }),
  });
  if (!res.ok) {
    const reason = res.status === 403 ? "Only a business admin can move an outlet pin." : (await res.text().catch(() => "")) || `Could not save the pin (${res.status})`;
    throw new Error(reason);
  }
}
