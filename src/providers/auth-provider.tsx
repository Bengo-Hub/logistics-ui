"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import { useMe } from "@/hooks/useMe";
import { useAuthStore } from "@/store/auth";

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

/** Redirect unauthenticated to SSO; redirect 403 from /me to unauthorized. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const status = useAuthStore((s) => s.status);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);
  const { isError, error, isLoading: meLoading } = useMe(!!session);

  const isAuthCallback = pathname?.includes("/auth/callback");
  const isUnauthorizedPage = pathname?.endsWith("/unauthorized");
  const orgSlug = pathname?.split("/")[1]; // tenant from path when on /[orgSlug]/...

  useEffect(() => {
    if (status === "loading" || isAuthCallback) return;
    if (!session && !isAuthCallback) {
      redirectToSSO(pathname ?? undefined, orgSlug);
      return;
    }
  }, [status, session, isAuthCallback, pathname, orgSlug, redirectToSSO]);

  useEffect(() => {
    if (!session || isUnauthorizedPage || meLoading) return;
    const statusCode = (error as { response?: { status?: number } })?.response?.status;
    if (isError && statusCode === 403) {
      const base = pathname?.split("/").slice(0, 2).join("/") || "";
      router.replace(base ? `${base}/unauthorized` : "/unauthorized");
    }
  }, [session, isError, error, isUnauthorizedPage, meLoading, pathname, router]);

  const loading = status === "loading" || (!!session && meLoading);
  if (loading && !isAuthCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Initializing session...</div>
      </div>
    );
  }

  if (!session && !isAuthCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Redirecting to sign-in...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => makeQueryClient());
  const showDevtools = process.env.NODE_ENV !== "production";
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
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
