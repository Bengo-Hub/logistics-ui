import { type NextRequest, NextResponse } from "next/server";

import { appIconPath, getAppBranding } from "@/lib/app-branding";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  // Name, colours and icon come from the tenant's logistics app branding (e.g. "Loft Dispatch"),
  // else "<Business> Logistics" with the business logo, else generated initials
  // (lib/app-branding, shared-ui-lib resolveAppIdentity). Never another tenant's identity.
  const branding = await getAppBranding(orgSlug);

  // Square PNGs generated for this tenant, so installs work whether the uploaded icon is an SVG,
  // a wide logo or missing.
  const icons = [
    { src: appIconPath(orgSlug, 192), sizes: "192x192", type: "image/png", purpose: "any" },
    { src: appIconPath(orgSlug, 512), sizes: "512x512", type: "image/png", purpose: "any" },
    { src: appIconPath(orgSlug, 192, true), sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: appIconPath(orgSlug, 512, true), sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
  const shortcutIcon = [{ src: appIconPath(orgSlug, 96), sizes: "96x96", type: "image/png" }];

  const manifest = {
    // id keeps each tenant's install distinct even though they share a host.
    id: `/${orgSlug}/`,
    name: branding.appName,
    short_name: branding.shortName,
    description: branding.description,
    start_url: `/${orgSlug}/`,
    scope: `/${orgSlug}/`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: branding.backgroundColor,
    theme_color: branding.themeColor,
    categories: ["business", "productivity"],
    lang: "en",
    icons,
    shortcuts: [
      {
        name: "Deliveries",
        short_name: "Deliveries",
        description: "Delivery jobs and their status",
        url: `/${orgSlug}/tasks`,
        icons: shortcutIcon,
      },
      {
        name: "Riders",
        short_name: "Riders",
        description: "Your riders and their vehicles",
        url: `/${orgSlug}/riders`,
        icons: shortcutIcon,
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
    },
  });
}
