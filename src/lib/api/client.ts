import axios from "axios";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://logisticsapi.codevertexitsolutions.com/api/v1/";
const NORMALISED_BASE_URL = DEFAULT_BASE_URL.endsWith("/")
  ? DEFAULT_BASE_URL
  : `${DEFAULT_BASE_URL}/`;

let accessTokenGetter: () => string | null = () => null;

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
  }
  return config;
});

export function attachAuthTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // If token is already cleared (explicit logout in progress), skip entirely
      if (!accessTokenGetter()) return Promise.reject(error);

      const url: string = error.config?.url ?? "";
      if (!url.includes("/auth/me") && !error.config?._retried) {
        const { refreshAccessToken } = await import("@/lib/auth/token-refresh");
        const newToken = await refreshAccessToken();

        if (newToken) {
          error.config._retried = true;
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }

        on401Callback?.();
      }
    }
    if (error.response?.status === 403 && onSubscription403Callback) {
      const data = error.response?.data;
      if (data?.code === 'subscription_inactive' || data?.upgrade === true) {
        onSubscription403Callback(data);
      }
    }
    return Promise.reject(error);
  },
);
