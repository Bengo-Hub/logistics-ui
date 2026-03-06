import type { SessionTokens, UserProfile } from "./types";

const AUTH_STORAGE_KEY = "logistics_auth";

interface PersistedAuthState {
  session: SessionTokens | null;
  user: UserProfile | null;
}

export function persistAuthState(state: Partial<PersistedAuthState>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAuthState();
    const merged = { ...existing, ...state };
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
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    return { session: null, user: null };
  }
}

export function clearAuthState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
