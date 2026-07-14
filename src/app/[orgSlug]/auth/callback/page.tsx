"use client";

import { SSOCallbackError } from "@bengo-hub/shared-ui-lib/auth";
import { useAuthStore } from "@/store/auth";
import { useOutletFilterStore } from "@/store/outlet-filter";
import { LOGISTICS_SELECTED_OUTLET_KEY } from "@/app/[orgSlug]/auth/select-outlet/page";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// The stored return URL was captured BEFORE the SSO hop. If the user switched
// organisation mid-login, its slug is stale — re-point the first path segment
// at the org the token was actually issued for. Cross-origin values are dropped.
function sanitizedReturnTo(raw: string | null, orgSlug: string): string | null {
  if (!raw) return null;
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const segments = url.pathname.split("/");
    if (segments[1] && segments[1] !== orgSlug) segments[1] = orgSlug;
    return segments.join("/") + url.search + url.hash;
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const handled = useRef(false);

  // OAuth error bounced back from the SSO authorize endpoint (e.g. access_denied).
  // Without this the page would wait for a ?code that never arrives and spin forever.
  const oauthError = searchParams?.get("error");
  const oauthErrorDescription = searchParams?.get("error_description");

  const handleSSOCallback = useAuthStore((s) => s.handleSSOCallback);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  useEffect(() => {
    if (status === 'authenticated') {
      // Sanitized: if the user switched organisation mid-login the stored URL
      // still carries the old slug.
      const returnTo = sanitizedReturnTo(sessionStorage.getItem("sso_return_to"), orgSlug) || `/${orgSlug}`;
      sessionStorage.removeItem("sso_return_to");

      const storedOutlet = typeof window !== 'undefined'
        ? localStorage.getItem(LOGISTICS_SELECTED_OUTLET_KEY)
        : null;

      if (storedOutlet) {
        router.replace(returnTo);
        return;
      }

      // Auto-preselect outlet from JWT claims for non-HQ users.
      const authUser = useAuthStore.getState().user;
      const jwtOutletId = (authUser as any)?.outlet_id || (authUser as any)?.outletId;
      const isHqUser = (authUser as any)?.is_hq_user || (authUser as any)?.isHqUser;

      if (jwtOutletId && !isHqUser) {
        useOutletFilterStore.getState().selectOutlet({
          id: jwtOutletId,
          code: (authUser as any)?.outlet_code ?? '',
          name: (authUser as any)?.outlet_code ?? '',
          useCase: (authUser as any)?.outlet_use_case,
        });
        localStorage.setItem(LOGISTICS_SELECTED_OUTLET_KEY, jwtOutletId);
        router.replace(returnTo);
        return;
      }

      // HQ user or no JWT outlet — show selector
      const next = returnTo !== `/${orgSlug}` ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
      router.replace(`/${orgSlug}/auth/select-outlet${next}`);
    }
  }, [status, orgSlug, router]);

  useEffect(() => {
    if (handled.current || oauthError) return;
    const code = searchParams.get("code");
    if (!code) return;

    handled.current = true;
    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;
    handleSSOCallback(code, callbackUrl, orgSlug);
  }, [searchParams, orgSlug, handleSSOCallback, oauthError]);

  // OAuth error from the SSO redirect, or a store error from the token
  // exchange / profile sync. "Sign in again" restarts the SSO flow with a
  // fresh PKCE challenge + authorize redirect.
  if (oauthError || status === "error") {
    return (
      <SSOCallbackError
        error={oauthError}
        errorDescription={oauthError ? oauthErrorDescription : error}
        orgSlug={orgSlug}
        lastKnownTenant={typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null}
        onRetry={() => {
          handled.current = false;
          void redirectToSSO(undefined, orgSlug);
        }}
        onSwitchTenant={(slug) => {
          handled.current = false;
          void redirectToSSO(undefined, slug);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          {status === "syncing" ? "Syncing your account..." : "Completing sign-in..."}
        </p>
      </div>
    </div>
  );
}
