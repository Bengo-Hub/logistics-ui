"use client";

import { useAuthStore } from "@/store/auth";

/**
 * True once the auth store has a signed-in profile. Tenant queries wait for it, so a page opened
 * before the session is restored does not fire requests with no Authorization header.
 *
 * Not tied to session.accessToken: in cookie mode the store reaches "authenticated" while the
 * token lives in the cookie session (the API client's token getter reads it there), so waiting
 * for a store token kept every list on "Loading..." for good.
 */
export function useAuthReady(): boolean {
  return useAuthStore((s) => s.status === "authenticated" && !!s.user);
}
