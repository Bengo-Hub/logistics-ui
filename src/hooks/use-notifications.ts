"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/logistics";
import { fetchStreamTicket, streamUrl } from "@/lib/api/stream";
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
 * WebSocket API can't set an Authorization header, so each connect first fetches a
 * single-use stream ticket (POST /{tenant}/stream-ticket with the Bearer token) and opens
 * the socket with "?ticket=". The access token never goes in the URL. The 30s poll in
 * useNotifications covers a socket that never connects or drops for good.
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

  const connect = useCallback(async () => {
    if (unmountedRef.current || !tenantSlug) return;
    if (typeof WebSocket === "undefined") return;
    if (!useAuthStore.getState().session?.accessToken) return;

    const scheduleReconnect = () => {
      if (unmountedRef.current) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attemptRef.current, RECONNECT_MAX_MS);
      attemptRef.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    // A fresh single-use ticket for every connect and reconnect.
    let ticket: string;
    try {
      ticket = await fetchStreamTicket(tenantSlug);
    } catch {
      scheduleReconnect();
      return;
    }
    if (unmountedRef.current) return;

    const ws = new WebSocket(streamUrl(tenantSlug, "notifications/stream", ticket, "ws"));
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
      scheduleReconnect();
    };
  }, [tenantSlug, qc]);

  useEffect(() => {
    unmountedRef.current = false;
    void connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, "component unmounted");
    };
  }, [connect]);
}
