"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      import("workbox-window").then(({ Workbox }) => {
        const wb = new Workbox("/sw.js");
        wb.register().catch((err) => {
          console.warn("SW registration failed:", err);
        });
      });
    }
  }, []);

  return null;
}
