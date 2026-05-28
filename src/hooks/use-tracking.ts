"use client";

import { useQuery } from "@tanstack/react-query";
import { trackByCodePublic } from "@/lib/api/logistics";
import type { TrackingInfo } from "@/types/logistics";

export function usePublicTracking(trackingCode: string) {
  return useQuery<TrackingInfo>({
    queryKey: ["tracking", trackingCode],
    queryFn: () => trackByCodePublic(trackingCode),
    enabled: !!trackingCode,
    refetchInterval: 10_000,
  });
}
