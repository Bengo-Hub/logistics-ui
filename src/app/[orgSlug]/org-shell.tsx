"use client";

import { useState, useEffect } from "react";
import { VerifyEmailPrompt } from '@/components/auth/VerifyEmailPrompt';
import { useParams } from "next/navigation";
import { AuthProvider } from "@/providers/auth-provider";
import { BrandingProvider } from "@/providers/branding-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { PwaRegistration } from "@/components/pwa-registration";
import { PWAUpdateBanner } from "@/components/pwa-update-banner";
import { PlatformScopeGuard } from "@/components/platform-scope-guard";

import { Footer } from "@/components/footer";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";

/**
 * Client-side belt-and-suspenders for the tenant manifest link. The authoritative
 * link is emitted server-side via `generateMetadata` in this segment's layout.tsx
 * (so mobile install captures the correct tenant); this keeps it correct across
 * in-app (SPA) navigation between tenant scopes.
 */
function ManifestInjector() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;
  useEffect(() => {
    if (!orgSlug) return;
    const href = `/${orgSlug}/manifest.webmanifest`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    if (link.href !== new URL(href, window.location.href).href) {
      link.href = href;
    }
  }, [orgSlug]);
  return null;
}

export function OrgShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <BrandingProvider>
        <ManifestInjector />
        <PlatformScopeGuard />
        <PWAUpdateBanner />
        <PwaRegistration />
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <SubscriptionBanner />
              <VerifyEmailPrompt />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </BrandingProvider>
    </AuthProvider>
  );
}
