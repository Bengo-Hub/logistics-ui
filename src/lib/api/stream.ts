import { api, NORMALISED_BASE_URL } from "@/lib/api/client";

interface StreamTicketResponse {
  ticket: string;
  expires_in: number;
}

/**
 * Trades the in-memory access token (sent as a Bearer header by the api client) for a
 * single-use stream ticket. WebSocket and EventSource requests cannot carry an Authorization
 * header, and a token in the URL would end up in access logs, so the streams take ?ticket=.
 * A ticket works once and expires within seconds: fetch a new one for every connect.
 */
export async function fetchStreamTicket(tenantSlug: string): Promise<string> {
  const { data } = await api.post<StreamTicketResponse>(`${tenantSlug}/stream-ticket`);
  return data.ticket;
}

/** Absolute URL of a tenant stream path with its ticket, e.g. ("acme", "notifications/stream"). */
export function streamUrl(tenantSlug: string, path: string, ticket: string, protocol: "http" | "ws"): string {
  const base = `${NORMALISED_BASE_URL}${tenantSlug}/${path.replace(/^\/+/, "")}`;
  const url = protocol === "ws" ? base.replace(/^http/, "ws") : base;
  return `${url}?ticket=${encodeURIComponent(ticket)}`;
}
