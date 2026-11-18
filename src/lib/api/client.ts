import axios from "axios";

// Normalize base URL: always ensure /api/v1 is present regardless of what the env var contains.
// This is resilient to the common misconfiguration of omitting /api/v1 from NEXT_PUBLIC_API_URL.
const _rawBase = (process.env.NEXT_PUBLIC_API_URL ?? "https://logisticsapi.codevertexafrica.com")
  .replace(/\/+$/, ""); // strip trailing slashes
export const NORMALISED_BASE_URL = _rawBase.includes("/api/v1")
  ? `${_rawBase}/`
  : `${_rawBase}/api/v1/`;

let accessTokenGetter: () => string | null = () => null;
let outletIdGetter: () => string | null = () => null;

/** Register a getter that returns the current outlet ID (e.g. from outlet-filter store). */
export function attachOutletIdGetter(getter: () => string | null) {
  outletIdGetter = getter;
}

export const api = axios.create({
  baseURL: NORMALISED_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = accessTokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    const isPlatformOwner = localStorage.getItem("is_platform_owner") === "true";
    if (!isPlatformOwner) {
      const tenantId = localStorage.getItem("tenantId");
      if (tenantId) {
        config.headers["X-Tenant-ID"] = tenantId;
      }
      const tenantSlug = localStorage.getItem("tenantSlug");
      if (tenantSlug) {
        config.headers["X-Tenant-Slug"] = tenantSlug;
      }
    }
    // Attach the outlet the user switched to (outlet-scoped requests). "all" is a deliberate
    // choice of every outlet, so it must never fall back to the last single outlet.
    const stored = localStorage.getItem("logistics-selected-outlet-id");
    const outletId = outletIdGetter() || (stored && stored !== "all" ? stored : "");
    if (outletId && stored !== "all") {
      config.headers["X-Outlet-ID"] = outletId;
    }
  }
  return config;
});

export function attachAuthTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
}

/** The signed-in access token the client sends (held in memory with the cookie session). */
export function currentAccessToken(): string | null {
  return accessTokenGetter();
}

let on401Callback: (() => void) | null = null;
let onSubscription403Callback: ((data: any) => void) | null = null;

/** Register a callback to run when any API response is 401 (e.g. clear session / redirect to auth). */
export function setOn401(callback: (() => void) | null) {
  on401Callback = callback;
}

/** Register a callback for subscription-related 403 errors (code=subscription_inactive, upgrade=true). */
export function setOnSubscription403(callback: ((data: any) => void) | null) {
  onSubscription403Callback = callback;
}

// Throttle for metered-limit toasts (polling can trigger 429/402 repeatedly).
let lastLimitToastAt = 0;

const AUTH_WAIT_MS = 10_000;
let pendingAuthWait: Promise<string | null> | null = null;

/**
 * Waits for the auth store to finish starting up and returns the token it ends with. A request
 * sent before the cookie session handed back its first token went out without one; this lets it
 * be retried once instead of failing the page. Shared, so a burst of such requests waits once.
 */
function waitForAuthToken(): Promise<string | null> {
  if (pendingAuthWait) return pendingAuthWait;
  pendingAuthWait = (async () => {
    // Dynamic import: the store imports this client.
    const { useAuthStore } = await import("@/store/auth");
    const settling = () => {
      const s = useAuthStore.getState().status;
      return s === "loading" || s === "syncing";
    };
    if (!settling()) {
      const { status, user } = useAuthStore.getState();
      // A known user without a token yet: start the session once (no-op when already done).
      if (status !== "authenticated" && user) await useAuthStore.getState().initialize();
    }
    if (settling()) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { unsub(); resolve(); }, AUTH_WAIT_MS);
        const unsub = useAuthStore.subscribe(() => {
          if (!settling()) { clearTimeout(timer); unsub(); resolve(); }
        });
      });
    }
    return accessTokenGetter();
  })().finally(() => { pendingAuthWait = null; });
  return pendingAuthWait;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // No token: either sign-in is still starting up (wait once, then retry once) or the user
      // signed out (the wait ends with no token and the error stands).
      if (!accessTokenGetter()) {
        if (error.config && !error.config._authWaited) {
          error.config._authWaited = true;
          const token = await waitForAuthToken();
          if (token) {
            error.config.headers.Authorization = `Bearer ${token}`;
            return api.request(error.config);
          }
        }
        return Promise.reject(error);
      }

      const url: string = error.config?.url ?? "";
      if (!url.includes("/auth/me") && !error.config?._retried) {
        const sent = String(error.config?.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "");
        const { refreshAccessToken } = await import("@/lib/auth/token-refresh");
        const newToken = await refreshAccessToken(sent || accessTokenGetter());

        if (newToken) {
          error.config._retried = true;
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }

        on401Callback?.();
      } else if (error.config?._retried) {
        // Even a freshly renewed token was refused: the session is unusable, so send the person
        // to sign in instead of leaving a page where every save fails.
        on401Callback?.();
      }
    }
    if (error.response?.status === 403 && onSubscription403Callback) {
      const data = error.response?.data;
      if (data?.code === 'subscription_inactive' || data?.upgrade === true) {
        onSubscription403Callback(data);
      }
    }
    // 429/402 = a metered limit (live tracking / routing requests) was reached. These are
    // hit by automated polling, so throttle the toast to once per 60s to avoid spamming.
    const ls = error.response?.status;
    if (ls === 429 || ls === 402) {
      const data = error.response?.data;
      if (data?.code === 'usage_limit_exceeded' || data?.metric) {
        const now = Date.now();
        if (now - lastLimitToastAt > 60_000) {
          lastLimitToastAt = now;
          void (async () => {
            const { toast } = await import('sonner');
            toast.warning('Plan usage limit reached', {
              description: data?.message || `Daily ${String(data?.metric ?? 'usage')} limit reached. Upgrade or enable extra usage in Settings.`,
              duration: 8000,
            });
          })();
        }
      }
    }
    return Promise.reject(error);
  },
);
