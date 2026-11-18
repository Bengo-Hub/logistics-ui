"use client";

import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/auth";

export interface TaskStreamEvent {
  event: string;
  data: {
    task_id: string;
    status: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

interface UseTaskStreamOptions {
  taskId: string;
  tenantSlug: string;
  enabled?: boolean;
  onEvent?: (event: TaskStreamEvent) => void;
}

export function useTaskStream({ taskId, tenantSlug, enabled = true, onEvent }: UseTaskStreamOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TaskStreamEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !taskId || !tenantSlug) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "https://logisticsapi.codevertexafrica.com/api/v1/";
    const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;

    // The signed-in token the store holds (in memory with the cookie session). The old read of an
    // "auth-storage" key never matched this app's storage, so the stream went without a token.
    const token = useAuthStore.getState().session?.accessToken ?? null;

    const url = `${base}/${tenantSlug}/tasks/${taskId}/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener("status_changed", (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as TaskStreamEvent["data"];
        const evt: TaskStreamEvent = { event: "status_changed", data: parsed };
        setLastEvent(evt);
        onEventRef.current?.(evt);
      } catch {
        // Malformed SSE data — ignore
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects; don't close unless unmounting
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [enabled, taskId, tenantSlug]);

  return { connected, lastEvent };
}
