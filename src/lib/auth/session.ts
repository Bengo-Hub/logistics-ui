import { cookieMode } from "./session-mode";
import type { SessionTokens, UserProfile } from "./types";

/** localStorage key of the saved session; also watched for writes from other tabs. */
export const AUTH_STORAGE_KEY = "logistics_auth";

interface PersistedAuthState {
  session: SessionTokens | null;
  user: UserProfile | null;
}

/**
 * Cookie session (fleet plan G11): only the profile is saved, and the tokens an earlier build
 * stored are dropped on first read. The access token stays in memory (lib/auth/cookie-session.ts).
 */
export function persistAuthState(state: Partial<PersistedAuthState>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAuthState();
    const merged = { ...existing, ...state };
    if (cookieMode()) merged.session = null;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // storage full or unavailable
  }
}

export function loadAuthState(): PersistedAuthState {
  if (typeof window === "undefined") return { session: null, user: null };
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { session: null, user: null };
    const parsed = JSON.parse(raw) as PersistedAuthState;
    if (cookieMode() && parsed.session) {
      const scrubbed = { ...parsed, session: null };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(scrubbed));
      return scrubbed;
    }
    return parsed;
  } catch {
    return { session: null, user: null };
  }
}

export function clearAuthState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
