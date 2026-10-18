import type { Metadata, Viewport } from "next";
import { appIconPath, getAppBranding } from "@/lib/app-branding";
import { OrgShell } from "./org-shell";

/**
 * Tenant identity in the server-rendered HTML: the browser tab title and favicon, the iOS
 * home-screen icon and label, and the tenant-specific PWA manifest link
 * (`/${orgSlug}/manifest.webmanifest`, overriding the root `/manifest.json`), same as
 * ordering-frontend. Mobile install flows only honour what is in the initial HTML, so this must
 * be server metadata, not a client-side `link.href` change.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const branding = await getAppBranding(orgSlug);
  return {
    // absolute: the root layout's "%s | Codevertex Logistics" template must not wrap the tenant's
    // own app name; pages below get "<page> | <app name>".
    title: {
      absolute: branding.appName,
      template: `%s | ${branding.appName}`,
    },
    description: branding.description,
    applicationName: branding.appName,
    manifest: `/${orgSlug}/manifest.webmanifest`,
    icons: {
      icon: [
        { url: appIconPath(orgSlug, 32), sizes: "32x32", type: "image/png" },
        { url: appIconPath(orgSlug, 192), sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: appIconPath(orgSlug, 180), sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: branding.shortName,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Viewport> {
  const { orgSlug } = await params;
  const branding = await getAppBranding(orgSlug);
  return { themeColor: branding.themeColor };
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <OrgShell>{children}</OrgShell>;
}
