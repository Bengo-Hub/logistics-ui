"use client";

import { useAuthStore } from "@/store/auth";

/**
 * True once the auth store has a signed-in session with an access token. Tenant queries wait for
 * it, so a page opened before the cookie session hands back its first token does not fire
 * requests with no Authorization header (they came back 401 and showed "Could not load").
 */
export function useAuthReady(): boolean {
  return useAuthStore((s) => s.status === "authenticated" && !!s.session?.accessToken);
}
