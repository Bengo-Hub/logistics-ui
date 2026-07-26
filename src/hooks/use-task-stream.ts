"use client";

import { useEffect, useRef, useState } from "react";

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

    const token = typeof window !== "undefined"
      ? (() => {
          try {
            const store = JSON.parse(localStorage.getItem("auth-storage") ?? "{}");
            return store?.state?.accessToken ?? null;
          } catch {
            return null;
          }
        })()
      : null;

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
