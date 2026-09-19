"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/logistics";
import { useAuthStore } from "@/store/auth";
import type { LogisticsNotification } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useNotifications(includeRead = false) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["notifications", tenantSlug, includeRead],
    queryFn: () => fetchNotifications(tenantSlug, includeRead),
    enabled: !!tenantSlug,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(tenantSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(tenantSlug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Connects to GET /{tenant}/notifications/stream for live push. A browser's native
 * WebSocket API can't set an Authorization header, so the access token rides as a
 * "?token=" query param instead (logistics-api's AuthenticateWS validates it the same way
 * as any Bearer token). Falls back gracefully — the 30s poll in useNotifications already
 * covers a socket that never connects or drops for good.
 */
export function useNotificationStream(onNotification?: (n: LogisticsNotification) => void) {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const unmountedRef = useRef(false);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    if (unmountedRef.current || !tenantSlug) return;
    if (typeof WebSocket === "undefined") return;

    const token = useAuthStore.getState().session?.accessToken;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "https://logisticsapi.codevertexafrica.com")
      .replace(/\/+$/, "");
    const base = apiBase.includes("/api/v1") ? apiBase : `${apiBase}/api/v1`;
    const wsBase = base.replace(/^http/, "ws");
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const url = `${wsBase}/${tenantSlug}/notifications/stream${qs}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "notification" && msg.data) {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          onNotificationRef.current?.(msg.data as LogisticsNotification);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attemptRef.current, RECONNECT_MAX_MS);
      attemptRef.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [tenantSlug, qc]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, "component unmounted");
    };
  }, [connect]);
}
