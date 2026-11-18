"use client";

import { useEffect, useRef, useState } from "react";

import { fetchStreamTicket, streamUrl } from "@/lib/api/stream";

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

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Live status of one task over SSE (GET /{tenant}/tasks/{id}/stream). EventSource cannot send
 * an Authorization header, so each connect first fetches a single-use stream ticket and opens
 * the stream with ?ticket=. The browser's own auto-reconnect would replay a used ticket, so on
 * error the stream is closed and reopened here with a fresh ticket and backoff.
 */
export function useTaskStream({ taskId, tenantSlug, enabled = true, onEvent }: UseTaskStreamOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TaskStreamEvent | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !taskId || !tenantSlug) return;

    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      attempt += 1;
      timer = setTimeout(connect, delay);
    };

    async function connect() {
      if (stopped) return;
      let ticket: string;
      try {
        ticket = await fetchStreamTicket(tenantSlug);
      } catch {
        scheduleReconnect();
        return;
      }
      if (stopped) return;

      const source = new EventSource(streamUrl(tenantSlug, `tasks/${taskId}/stream`, ticket, "http"));
      es = source;

      source.onopen = () => {
        attempt = 0;
        setConnected(true);
      };

      source.addEventListener("status_changed", (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as TaskStreamEvent["data"];
          const evt: TaskStreamEvent = { event: "status_changed", data: parsed };
          setLastEvent(evt);
          onEventRef.current?.(evt);
        } catch {
          // Malformed SSE data: ignore
        }
      });

      source.onerror = () => {
        setConnected(false);
        source.close();
        if (es === source) es = null;
        scheduleReconnect();
      };
    }

    void connect();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      es?.close();
      es = null;
      setConnected(false);
    };
  }, [enabled, taskId, tenantSlug]);

  return { connected, lastEvent };
}
