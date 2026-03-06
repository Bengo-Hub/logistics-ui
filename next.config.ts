import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logisticsapi.codevertexitsolutions.com",
      },
      {
        protocol: "https",
        hostname: "accounts.codevertexitsolutions.com",
      },
      {
        protocol: "https",
        hostname: "sso.codevertexitsolutions.com",
      },
    ],
  },
};

export default withPWA(nextConfig);
