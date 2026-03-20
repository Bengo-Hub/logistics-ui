"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search } from "lucide-react";

export default function TrackSearchPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) {
      router.push(`/track/${trimmed}`);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <Package className="mx-auto size-16 text-primary" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Track Your Delivery</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your tracking code or order number to see delivery status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g. CV-20260320-A3F8K2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-10 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!code.trim()}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Track
          </button>
        </form>

        <p className="text-xs text-muted-foreground">
          Tracking codes are provided in your delivery confirmation email or SMS.
        </p>
      </div>
    </div>
  );
}
