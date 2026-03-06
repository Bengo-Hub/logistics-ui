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
    const tenantId = localStorage.getItem("tenantId");
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }
    const tenantSlug = localStorage.getItem("tenantSlug");
    if (tenantSlug) {
      config.headers["X-Tenant-Slug"] = tenantSlug;
    }
  }
  return config;
});

export function attachAuthTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
}
