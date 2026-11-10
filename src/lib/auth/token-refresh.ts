/**
 * Access-token refresh for logistics-ui, built on the shared cross-tab-safe refresher
 * (@bengo-hub/shared-ui-lib/auth createSessionRefresher). Before spending the refresh token it
 * picks up a newer session another tab saved, tabs take turns refreshing, and an enrolment-only
 * answer counts as signed out. See the shared module for the full story.
 *
 * This app's auth store is a plain zustand store saved by hand to localStorage under
 * AUTH_STORAGE_KEY (lib/auth/session.ts), not zustand persist, so reading and saving go through
 * loadAuthState and persistAuthState.
 */

import { createSessionRefresher } from '@bengo-hub/shared-ui-lib/auth';
import { useAuthStore } from '@/store/auth';
import { refreshTokens } from '@/lib/auth/api';
import { AUTH_STORAGE_KEY, loadAuthState, persistAuthState } from '@/lib/auth/session';

export { AUTH_STORAGE_KEY };

/**
 * Loads the session another tab saved into this tab's store. A missing stored session leaves
 * memory alone; the next refused call signs this tab out the usual way.
 */
export function reloadSessionFromStorage(): void {
  const stored = loadAuthState();
  if (!stored.session) return;
  const { session, user } = useAuthStore.getState();
  if (stored.session.accessToken === session?.accessToken) return;
  useAuthStore.setState({ session: stored.session, user: stored.user ?? user });
}

const refreshSession = createSessionRefresher({
  lockName: AUTH_STORAGE_KEY,
  getSession: () => useAuthStore.getState().session,
  reloadSession: reloadSessionFromStorage,
  saveSession: (session) => {
    useAuthStore.setState({ session });
    // Save it for the other tabs too; this app's store does not save itself.
    persistAuthState({ session });
  },
  refresh: refreshTokens,
});

/**
 * Returns a usable access token, or null when the session is over (or auth-api could not be
 * reached; callers here already treat both the same way). Pass the token the server just
 * rejected when it is known.
 */
export async function refreshAccessToken(failedToken?: string | null): Promise<string | null> {
  const outcome = await refreshSession(failedToken);
  return 'token' in outcome ? outcome.token : null;
}
