import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function orgRoute(orgSlug: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${orgSlug}${clean === "/" ? "" : clean}`;
}

/** A readable message from a failed API call: the API's text or {error} body, else the fallback. */
export function apiErrorText(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof body === "string" && body.trim()) return body.trim();
  if (body && typeof body === "object") {
    const msg = (body as { error?: unknown; message?: unknown }).error ?? (body as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
}
