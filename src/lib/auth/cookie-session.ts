/**
 * The cookie session for logistics-ui (fleet plan G11; shared-ui-lib createCookieSession).
 *
 * The refresh token lives in auth-api's HttpOnly cookie on sso.codevertexafrica.com, out of reach
 * of page scripts. The access token lives in memory. The store's `session` stays the in-memory
 * mirror that every caller already reads (the API client reads it through attachAuthTokenGetter;
 * refreshToken is always empty, and lib/auth/session.ts never saves it in this mode), so no
 * component changes.
 */

import { createCookieSession, type CookieSession, type CookieSessionState } from '@bengo-hub/shared-ui-lib/auth';
import { useAuthStore } from '@/store/auth';
import { persistAuthState } from '@/lib/auth/session';

const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_URL ?? 'https://sso.codevertexafrica.com';
const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID ?? 'logistics-ui';

let current: CookieSession | null = null;

/** The store's session shape for an in-memory access token. */
function mirror(s: CookieSessionState) {
  const sessionId = useAuthStore.getState().session?.sessionId ?? '';
  return { accessToken: s.accessToken, refreshToken: '', expiresAt: new Date(s.expiresAt).toISOString(), sessionId };
}

/**
 * Keeps the store in step with the cookie session, including a token or a sign-out another tab
 * shared. When a different person signs in elsewhere (one sso cookie serves every app), this tab
 * drops its profile, tenant and outlet choice and reloads as that person.
 */
function onChange(s: CookieSessionState | null) {
  const store = useAuthStore.getState();
  if (!s) {
    if (store.session || store.status === 'authenticated') useAuthStore.setState({ session: null, status: 'idle' });
    return;
  }
  const nextUserId = (s.payload.user as { id?: string } | undefined)?.id;
  if (store.user && nextUserId && nextUserId !== store.user.id) {
    useAuthStore.setState({ user: null, session: null, subscriptionInfo: undefined, status: 'idle' });
    persistAuthState({ user: null });
    try {
      localStorage.removeItem('tenantId');
      localStorage.removeItem('tenantSlug');
      localStorage.removeItem('is_platform_owner');
      localStorage.removeItem('logistics-selected-outlet-id');
    } catch {
      /* no storage */
    }
    window.location.reload();
    return;
  }
  useAuthStore.setState({ session: mirror(s) });
}

export function getCookieSession(): CookieSession {
  current ??= createCookieSession({ authBaseUrl: SSO_BASE_URL, clientId: SSO_CLIENT_ID, onChange });
  return current;
}
