"use client";

import { useState } from "react";
import { AuthProvider } from "@/providers/auth-provider";
import { BrandingProvider } from "@/providers/branding-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { PwaRegistration } from "@/components/pwa-registration";

import { Footer } from "@/components/footer";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <BrandingProvider>
        <PwaRegistration />
        <div className="flex min-h-dvh flex-col">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <SubscriptionBanner />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col">
              <div className="flex-1">{children}</div>
              <Footer />
            </main>
          </div>
        </div>
      </BrandingProvider>
    </AuthProvider>
  );
}
