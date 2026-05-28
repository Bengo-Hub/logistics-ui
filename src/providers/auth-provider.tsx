"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Fingerprint, Loader2 } from "lucide-react";

import { useBiometric } from "@/hooks/use-biometric";
import { useMe } from "@/hooks/useMe";
import { attachOutletIdGetter, setOn401 } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth";
import { useOutletFilterStore } from "@/store/outlet-filter";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,     // 5 min — most data is reference/moderate
        gcTime: 10 * 60 * 1000,        // 10 min garbage collection
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * AuthSync silently keeps the auth store in sync with fresh SSO /me data.
 * It does NOT block rendering — useMe loads in the background.
 * Pattern adapted from ordering-frontend/src/providers/app-providers.tsx.
 */
function AuthSync() {
  const session = useAuthStore((s) => s.session);
  const { isError, error } = useMe(!!session?.accessToken);
  const pathname = usePathname();
  const router = useRouter();
  const isUnauthorizedPage = pathname?.endsWith("/unauthorized");

  useEffect(() => {
    if (!session || isUnauthorizedPage || !isError) return;
    const statusCode = (error as { response?: { status?: number } })?.response?.status;
    if (statusCode === 403) {
      const data = (error as any)?.response?.data;
      if (data?.code === 'subscription_inactive' || data?.upgrade === true) return;
      const base = pathname?.split("/").slice(0, 2).join("/") || "";
      router.replace(base ? `${base}/unauthorized` : "/unauthorized");
    }
  }, [session, isError, error, isUnauthorizedPage, pathname, router]);

  return null;
}

/** Redirect unauthenticated to SSO; show loading only during initialize(). */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const status = useAuthStore((s) => s.status);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);
  const hydrateFromWebAuthn = useAuthStore((s) => s.hydrateFromWebAuthn);

  const isAuthCallback = pathname?.includes("/auth/callback");
  const orgSlug = pathname?.split("/")[1];

  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const ssoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isSupported: biometricSupported, hasRegisteredCredential, authenticate: biometricAuth, isLoading: biometricLoading, error: biometricError } = useBiometric({
    onAuthSuccess: (tokens) => {
      if (ssoTimerRef.current) clearTimeout(ssoTimerRef.current);
      hydrateFromWebAuthn(tokens, orgSlug);
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") setStoredEmail(localStorage.getItem("sso_last_email"));
  }, []);

  useEffect(() => {
    if (status === "loading" || isAuthCallback) return;
    if (!session && !isAuthCallback) {
      const hasBiometric = biometricSupported && hasRegisteredCredential && !!storedEmail;
      if (hasBiometric) {
        ssoTimerRef.current = setTimeout(() => {
          redirectToSSO(pathname ?? undefined, orgSlug);
        }, 4000);
      } else {
        redirectToSSO(pathname ?? undefined, orgSlug);
      }
      return () => { if (ssoTimerRef.current) clearTimeout(ssoTimerRef.current); };
    }
  }, [status, session, isAuthCallback, pathname, orgSlug, redirectToSSO, biometricSupported, hasRegisteredCredential, storedEmail]);

  // Only block rendering during active initialize() — not while background SSO sync loads.
  const loading = status === "loading";
  if (loading && !isAuthCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Initializing session...</div>
      </div>
    );
  }

  if (!session && !isAuthCallback) {
    const hasBiometric = biometricSupported && hasRegisteredCredential && !!storedEmail;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        {hasBiometric ? (
          <>
            <button
              onClick={() => { if (ssoTimerRef.current) clearTimeout(ssoTimerRef.current); biometricAuth(storedEmail!, orgSlug); }}
              disabled={biometricLoading}
              className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors"
            >
              {biometricLoading ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
              {biometricLoading ? "Verifying…" : "Sign in with fingerprint"}
            </button>
            {biometricError && <p className="text-xs text-destructive">{biometricError}</p>}
            <p className="text-xs text-muted-foreground">or redirecting to sign-in…</p>
          </>
        ) : (
          <div className="animate-pulse text-muted-foreground">Redirecting to sign-in...</div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => makeQueryClient());
  const showDevtools = process.env.NODE_ENV !== "production";
  const initializeAuth = useAuthStore((state) => state.initialize);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Attach outlet ID getter so the API interceptor always sends X-Outlet-ID
  useEffect(() => {
    attachOutletIdGetter(() => useOutletFilterStore.getState().outletIdHeader());
  }, []);

  // Rehydrate outlet from localStorage on mount (for page refreshes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('logistics-selected-outlet-id');
    if (stored && !useOutletFilterStore.getState().selectedOutlet) {
      useOutletFilterStore.getState().selectOutlet({
        id: stored,
        code: '',
        name: '',
      });
    }
  }, []);

  // Register 401 handler: clear all caches and redirect to SSO.
  // Skip during syncing/loading to avoid clearing session during JIT sync.
  // Also skip within 15s of authentication (tokens may still be propagating).
  // Note: the primary defense is token refresh in client.ts — this callback
  // only fires after refresh has already failed.
  useEffect(() => {
    setOn401(() => {
      const { status, lastAuthenticatedAt } = useAuthStore.getState();
      if (status === "syncing" || status === "loading") return;
      if (lastAuthenticatedAt && Date.now() - lastAuthenticatedAt < 15_000) return;
      queryClient.clear();
      void logout();
    });
    return () => setOn401(null);
  }, [queryClient, logout]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthSync />
        <AuthGuard>
          {children}
        </AuthGuard>
        {showDevtools ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
