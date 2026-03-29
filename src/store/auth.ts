import type { AxiosError } from "axios";
import { create } from "zustand";

import { attachAuthTokenGetter } from "@/lib/api/client";
import {
    buildAuthorizeUrl,
    buildLogoutUrl,
    exchangeCodeForTokens,
    fetchProfile,
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
  initialize: () => Promise<void>;
  /** Subscription info fetched lazily after login (undefined = not started, null = loading). */
  subscriptionInfo: Record<string, unknown> | null | undefined;
  setSubscriptionInfo: (info: Record<string, unknown> | null) => void;

  /** returnTo = URL to resume after login; tenant = slug when in tenant context (e.g. from path). */
  redirectToSSO: (returnTo?: string, tenant?: string) => Promise<void>;
  handleSSOCallback: (code: string, callbackUrl: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadAuthState(),
  status: "idle",
  error: null,
  subscriptionInfo: undefined,
  setSubscriptionInfo: (info: Record<string, unknown> | null) => set({ subscriptionInfo: info }),

  initialize: async () => {
    const { session, user } = get();
    if (!session) {
      set({ status: "idle", user: null, error: null });
      return;
    }

    if (user && session) {
      set({ status: "authenticated" });
      return;
    }

    try {
      set({ status: "loading", error: null });
      const response = await fetchProfile();
      applyAuthResponse(set, response);
    } catch (error) {
      const status = extractStatus(error);
      if (status === 401 || status === 403) {
        clearAuthState();
        set({ status: "idle", user: null, session: null, error: null });
      } else if (user && session) {
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
          const response = await fetchProfile();
          const u = response.user;
          applyAuthResponse(set, {
            session: { ...session, sessionId: response.session?.sessionId ?? "" },
            user: u,
          });
          return;
        } catch (err) {
          const httpStatus = extractStatus(err);
          if (httpStatus === 404 || httpStatus === 401) {
            syncAttempts++;
            await new Promise((r) => setTimeout(r, pollInterval));
            continue;
          }
          throw err;
        }
      }

      set({ status: "authenticated", session, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      set({ status: "error", error: message });
    }
  },

  logout: async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tenantId");
      localStorage.removeItem("tenantSlug");
    }
    clearAuthState();
    set({ status: "idle", user: null, session: null, error: null });
    if (typeof window !== "undefined") {
      window.location.href = buildLogoutUrl(window.location.origin);
    }
  },
}));

attachAuthTokenGetter(() => useAuthStore.getState().session?.accessToken ?? null);
