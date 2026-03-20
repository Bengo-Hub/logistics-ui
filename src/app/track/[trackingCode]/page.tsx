"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Circle,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  Truck,
  User,
} from "lucide-react";
import type { TrackingInfo } from "@/types/logistics";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://logisticsapi.codevertexitsolutions.com/api/v1";

const STATUS_STEPS = [
  { key: "pending", label: "Task Created", icon: Package },
  { key: "assigned", label: "Rider Assigned", icon: User },
  { key: "accepted", label: "Rider Accepted", icon: Check },
  { key: "en_route_pickup", label: "Heading to Pickup", icon: Truck },
  { key: "picked_up", label: "Order Picked Up", icon: Package },
  { key: "en_route_dropoff", label: "On the Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
];

function getStepIndex(status: string): number {
  const statusMap: Record<string, number> = {
    pending: 0,
    assigned: 1,
    accepted: 2,
    en_route: 3,
    en_route_pickup: 3,
    arrived_pickup: 4,
    picked_up: 4,
    en_route_dropoff: 5,
    arrived_dropoff: 6,
    delivered: 6,
    completed: 6,
  };
  return statusMap[status] ?? 0;
}

export default function PublicTrackingPage() {
  const params = useParams();
  const trackingCode = params.trackingCode as string;
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchTracking() {
      try {
        const baseUrl = API_BASE.replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/track/${trackingCode}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Tracking code not found. Please check and try again.");
          } else {
            setError("Unable to fetch tracking data. Please try again later.");
          }
          return;
        }
        const data = await res.json();
        setTracking(data);
        setError(null);
      } catch {
        setError("Network error. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTracking();
    interval = setInterval(fetchTracking, 15_000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [trackingCode]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading tracking info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Package className="mx-auto size-16 text-muted-foreground/30" />
          <h2 className="mt-4 text-xl font-semibold">Tracking Not Found</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{trackingCode}</p>
          <Link
            href="/track"
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="size-4" /> Try another code
          </Link>
        </div>
      </div>
    );
  }

  if (!tracking) return null;

  const currentStepIndex = getStepIndex(tracking.status);
  const isFinal = ["delivered", "completed", "failed", "cancelled"].includes(tracking.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Link href="/track" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Delivery Tracking</h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{tracking.tracking_code}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                isFinal
                  ? tracking.status === "delivered" || tracking.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {tracking.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Timeline */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-6 text-lg font-semibold">Status Timeline</h2>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, idx) => {
              const isPassed = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex && !isFinal;
              const Icon = step.icon;

              // Find matching history event
              const historyEvent = tracking.status_history?.find(
                (h) => h.status === step.key
              );

              return (
                <div key={step.key} className="flex gap-4">
                  {/* Vertical line + circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full border-2 ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isPassed
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-muted-foreground/20 bg-background text-muted-foreground/30"
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <Check className="size-4" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-8 ${
                          isPassed ? "bg-green-500" : "bg-muted-foreground/10"
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6">
                    <p
                      className={`text-sm font-medium ${
                        isPassed ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </p>
                    {historyEvent && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(historyEvent.at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Details */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Delivery Details</h2>
          <div className="space-y-4">
            {tracking.pickup_location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-green-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                  <p className="text-sm">{tracking.pickup_location}</p>
                </div>
              </div>
            )}
            {tracking.dropoff_location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Dropoff</p>
                  <p className="text-sm">{tracking.dropoff_location}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rider Info */}
        {tracking.rider && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Rider</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Rider #{tracking.rider.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{tracking.rider.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live tracking button */}
        {tracking.live_tracking_available && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <Truck className="mx-auto size-8 text-primary" />
            <p className="mt-2 text-sm font-medium">Live tracking available</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Map view will be available after @bengo-hub/maps integration
            </p>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <p className="text-center text-xs text-muted-foreground">
          <Clock className="mr-1 inline size-3" />
          Auto-refreshing every 15 seconds
        </p>
      </div>
    </div>
  );
}
