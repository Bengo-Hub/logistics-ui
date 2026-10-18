import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { appIconResponse } from "@bengo-hub/shared-ui-lib/app-icon";

import { getAppBranding } from "@/lib/app-branding";

// Square PNG app icons (favicon, apple-touch-icon, PWA manifest) generated from the tenant's
// logistics app icon or business logo, else the app's initials (shared-ui-lib app-icon).
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; size: string }> },
) {
  const { orgSlug, size } = await params;
  const branding = await getAppBranding(orgSlug);
  return appIconResponse(ImageResponse, {
    size,
    maskable: request.nextUrl.searchParams.get("maskable") === "1",
    iconUrl: branding.iconUrl,
    name: branding.appName,
    themeColor: branding.themeColor,
  });
}
