"use client";

import { useAuthStore } from "@/store/auth";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const handled = useRef(false);

  const handleSSOCallback = useAuthStore((s) => s.handleSSOCallback);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  useEffect(() => {
    if (status === 'authenticated') {
      const returnTo = sessionStorage.getItem("sso_return_to") || `/${orgSlug}`;
      sessionStorage.removeItem("sso_return_to");
      router.replace(returnTo);
    }
  }, [status, orgSlug, router]);

  useEffect(() => {
    if (handled.current) return;
    const code = searchParams.get("code");
    if (!code) return;

    handled.current = true;
    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;
    handleSSOCallback(code, callbackUrl, orgSlug);
  }, [searchParams, orgSlug, handleSSOCallback]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        {status === "error" ? (
          <>
            <p className="text-lg font-semibold text-destructive">Authentication Error</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {status === "syncing" ? "Syncing your account..." : "Completing sign-in..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
