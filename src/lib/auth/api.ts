import { api } from "@/lib/api/client";
import type { AuthResponse } from "@/lib/auth/types";

const SSO_BASE_URL =
  process.env.NEXT_PUBLIC_SSO_URL ?? "https://sso.codevertexitsolutions.com";
const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID ?? "logistics-ui";

export function buildAuthorizeUrl(params: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
  scope?: string;
  tenant?: string;
}): string {
  const url = new URL("/api/v1/authorize", SSO_BASE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", SSO_CLIENT_ID);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scope ?? "openid profile email offline_access");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.tenant) {
    url.searchParams.set("tenant", params.tenant);
  }
  return url.toString();
}

export function buildLogoutUrl(postLogoutRedirectUri?: string): string {
  const url = new URL("/api/v1/auth/logout", SSO_BASE_URL);
  if (postLogoutRedirectUri) {
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  }
  return url.toString();
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: SSO_CLIENT_ID,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(`${SSO_BASE_URL}/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || errorData.error || "Token exchange failed");
  }

  return response.json();
}

/**
 * Fetch user profile from SSO auth-api (not backend — avoids JIT sync delay).
 * SSO always has the user immediately after login.
 */
export async function fetchProfile(accessToken?: string): Promise<AuthResponse> {
  const token = accessToken ?? (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null)
    ?? (typeof window !== "undefined" ? (() => { try { const s = JSON.parse(localStorage.getItem("logistics-auth-state") ?? "{}"); return s.session?.accessToken; } catch { return null; } })() : null);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${SSO_BASE_URL}/api/v1/auth/me`, { headers });
  if (!res.ok) {
    const err: any = new Error(res.status === 401 ? "Unauthorized" : "SSO /me failed");
    err.response = { status: res.status };
    throw err;
  }
  const data = await res.json();
  const roles = Array.isArray(data.roles) ? data.roles : data.role ? [data.role] : [];
  const user = {
    id: data.id ?? "",
    email: data.email ?? "",
    fullName: data.fullName ?? data.full_name ?? data.email ?? "",
    firstName: data.profile?.first_name as string ?? "",
    lastName: data.profile?.last_name as string ?? "",
    roles,
    role: roles[0] ?? "",
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    tenantId: data.tenant_id ?? "",
    tenantSlug: data.tenant_slug ?? "",
    isPlatformOwner: data.is_platform_owner === true,
    isSuperUser: roles.includes("superuser"),
    phone: data.profile?.phone as string ?? "",
  };
  return { user, session: { accessToken: token ?? "", refreshToken: "", expiresAt: "", sessionId: "" } } as AuthResponse;
}
