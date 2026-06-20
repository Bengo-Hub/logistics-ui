import type { AxiosError } from "axios";
import { create } from "zustand";

import { attachAuthTokenGetter } from "@/lib/api/client";
import {
    buildAuthorizeUrl,
    buildLogoutUrl,
    exchangeCodeForTokens,
    fetchProfile,
    revokeServerSession,
} from "@/lib/auth/api";
import {
    consumeState,
    consumeVerifier,
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    storeState,
    storeVerifier,
} from "@/lib/auth/pkce";
import { clearAuthState, loadAuthState, persistAuthState } from "@/lib/auth/session";
import type { AuthResponse, SessionTokens, UserProfile, UserRole } from "@/lib/auth/types";

type AuthStatus = "idle" | "loading" | "authenticated" | "syncing" | "error" | "subscription_required";

interface AuthState {
  status: AuthStatus;
  error: string | null;
  session: SessionTokens | null;
  user: UserProfile | null;
  lastAuthenticatedAt: number | null;
  initialize: () => Promise<void>;
  /** Subscription info fetched lazily after login (undefined = not started, null = loading). */
  subscriptionInfo: Record<string, unknown> | null | undefined;
  setSubscriptionInfo: (info: Record<string, unknown> | null) => void;

  /** returnTo = URL to resume after login; tenant = slug when in tenant context (e.g. from path). */
  redirectToSSO: (returnTo?: string, tenant?: string) => Promise<void>;
  handleSSOCallback: (code: string, callbackUrl: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrateFromWebAuthn: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }, tenantSlug?: string) => Promise<void>;
}

function applyAuthResponse(set: (value: Partial<AuthState>) => void, response: AuthResponse) {
  if (typeof window !== "undefined") {
    if (response.user.tenantId) localStorage.setItem("tenantId", response.user.tenantId);
    if (response.user.tenantSlug) localStorage.setItem("tenantSlug", response.user.tenantSlug);
  }
  const newState = {
    status: "authenticated" as const,
    session: response.session,
    user: response.user,
    error: null,
    lastAuthenticatedAt: Date.now(),
  };
  persistAuthState(newState);
  set(newState);
}

function isAxiosAuthError(error: unknown): error is AxiosError {
  return typeof error === "object" && error !== null && (error as AxiosError).isAxiosError === true;
}

function extractStatus(error: unknown): number | undefined {
  if (isAxiosAuthError(error)) return error.response?.status;
  return undefined;
}

/**
 * Determine the initial auth status from persisted storage.
 * Sets "authenticated" immediately if both session + user exist and token hasn't expired.
 * This prevents the brief "Initializing session..." flash on page load when the user
 * has a valid cached session.
 */
function getInitialAuthState(): Pick<AuthState, "session" | "user" | "status" | "error"> {
  const loaded = loadAuthState();
  if (loaded.session && loaded.user) {
    const expiresAt = loaded.session.expiresAt ? new Date(loaded.session.expiresAt).getTime() : 0;
    const isValid = !expiresAt || Date.now() < expiresAt - 60_000;
    return { ...loaded, status: isValid ? "authenticated" : "idle", error: null };
  }
  return { ...loaded, status: "idle", error: null };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...getInitialAuthState(),
  lastAuthenticatedAt: null,
  subscriptionInfo: undefined,
  setSubscriptionInfo: (info: Record<string, unknown> | null) => set({ subscriptionInfo: info }),

  initialize: async () => {
    const { session, user } = get();
    if (!session) {
      set({ status: "idle", user: null, error: null });
      return;
    }

    // If we have a valid cached session with a non-expired token, skip the SSO round-trip.
    if (user && session) {
      const expiresAt = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
      if (!expiresAt || Date.now() < expiresAt - 60_000) {
        set({ status: "authenticated" });
        return;
      }
    }

    // Token is expired (or no user in store) — re-validate with SSO.
    try {
      set({ status: "loading", error: null });
      const response = await fetchProfile(session.accessToken);
      applyAuthResponse(set, response);
    } catch (error) {
      const status = extractStatus(error);
      if (status === 401) {
        clearAuthState();
        set({ status: "idle", user: null, session: null, error: null });
        return;
      }
      // 403 = authenticated but lacking permission/subscription — do NOT clear session
      if (status === 403) {
        if (user) set({ status: "authenticated" });
        return;
      }
      // Network error / SSO down — use cached user if available
      if (user && session) {
        set({ status: "authenticated" });
      } else {
        set({ status: "error", error: "Connection failed" });
      }
    }
  },

  redirectToSSO: async (returnTo?: string, tenant?: string) => {
    set({ status: "loading", error: null });
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const state = generateState();

      storeVerifier(verifier);
      storeState(state);

      if (returnTo && typeof window !== "undefined") {
        sessionStorage.setItem("sso_return_to", returnTo);
      }

      const callbackUrl =
        typeof window !== "undefined"
          ? tenant
            ? `${window.location.origin}/${tenant}/auth/callback`
            : `${window.location.origin}${window.location.pathname.split("/").slice(0, 2).join("/")}/auth/callback`
          : "";

      const authorizeUrl = buildAuthorizeUrl({
        codeChallenge: challenge,
        state,
        redirectUri: callbackUrl,
        tenant,
      });

      if (typeof window !== "undefined") {
        window.location.href = authorizeUrl;
      }
    } catch {
      set({ status: "error", error: "Failed to start sign-in. Please try again." });
    }
  },

  handleSSOCallback: async (code: string, callbackUrl: string, tenantSlug?: string) => {
    set({ status: "syncing", error: null });

    const verifier = consumeVerifier();
    consumeState();

    if (!verifier) {
      set({ status: "error", error: "Authentication session expired. Please try again." });
      return;
    }

    try {
      if (tenantSlug && typeof window !== "undefined") {
        localStorage.setItem("tenantSlug", tenantSlug);
      }
      const tokens = await exchangeCodeForTokens({
        code,
        codeVerifier: verifier,
        redirectUri: callbackUrl,
      });

      const session: SessionTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        sessionId: "",
      };
      persistAuthState({ session, user: null });
      set({ session });

      let syncAttempts = 0;
      const maxAttempts = 10;
      const pollInterval = 1000;

      while (syncAttempts < maxAttempts) {
        try {
          const response = await fetchProfile(session.accessToken);
          const u = response.user;
          if (typeof window !== "undefined" && u.email) {
            localStorage.setItem("sso_last_email", u.email);
          }
          applyAuthResponse(set, {
            session: { ...session, sessionId: response.session?.sessionId ?? "" },
            user: u,
          });
          return;
        } catch (err) {
          const httpStatus = extractStatus(err) ?? (err as any)?.response?.status;
          if (httpStatus === 404) {
            // User not yet JIT-provisioned — retry
            syncAttempts++;
            await new Promise((r) => setTimeout(r, pollInterval));
            continue;
          }
          // 401 = invalid token (not a sync delay); surface the error
          throw err;
        }
      }

      set({ status: "authenticated", session, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      set({ status: "error", error: message });
    }
  },

  hydrateFromWebAuthn: async (tokens, tenantSlug) => {
    set({ status: "loading", error: null });
    try {
      if (tenantSlug && typeof window !== "undefined") {
        localStorage.setItem("tenantSlug", tenantSlug);
      }
      const session: SessionTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? "",
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
        sessionId: "",
      };
      persistAuthState({ session, user: null });
      set({ session });
      const response = await fetchProfile(session.accessToken);
      const u = response.user;
      if (typeof window !== "undefined" && u.email) {
        localStorage.setItem("sso_last_email", u.email);
      }
      applyAuthResponse(set, {
        session: { ...session, sessionId: response.session?.sessionId ?? "" },
        user: u,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Biometric login failed";
      set({ status: "error", error: message });
    }
  },

  logout: async () => {
    const token = get().session?.accessToken;
    await revokeServerSession(token);
    clearAuthState();
    set({ status: "idle", user: null, session: null, error: null, subscriptionInfo: undefined, lastAuthenticatedAt: null });
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("tenantId"); } catch { /* no-op */ }
      try { localStorage.removeItem("tenantSlug"); } catch { /* no-op */ }
      try { localStorage.removeItem("is_platform_owner"); } catch { /* no-op */ }
      try { sessionStorage.clear(); } catch { /* no-op */ }
      const returnTo = encodeURIComponent(window.location.origin);
      window.location.href = buildLogoutUrl(`https://accounts.codevertexitsolutions.com/login?return_to=${returnTo}`);
    }
  },
}));

attachAuthTokenGetter(() => useAuthStore.getState().session?.accessToken ?? null);
