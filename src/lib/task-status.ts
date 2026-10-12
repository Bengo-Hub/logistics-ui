import type { TaskStatus } from "@/types/logistics";

// One place for task status wording and grouping in the UI. Mirrors logistics-api's
// internal/modules/tasks/statuses.go so the board, task pages and dashboard agree.

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Waiting for a rider",
  assigned: "Assigned",
  accepted: "Accepted",
  en_route: "On the way",
  en_route_pickup: "Heading to pickup",
  arrived_pickup: "At pickup",
  picked_up: "Picked up",
  en_route_dropoff: "Heading to customer",
  arrived_dropoff: "At customer",
  delivered: "Delivered",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function taskStatusLabel(status: string): string {
  return TASK_STATUS_LABEL[status as TaskStatus] ?? status.replace(/_/g, " ");
}

export type BadgeTone = "warning" | "default" | "secondary" | "success" | "destructive";

export function taskStatusTone(status: string): BadgeTone {
  if (status === "pending") return "warning";
  if (DELIVERED_STATUSES.includes(status as TaskStatus)) return "success";
  if (["failed", "cancelled", "returned"].includes(status)) return "destructive";
  if (status === "assigned" || status === "accepted") return "default";
  return "secondary";
}

/** The order is still at the outlet, so the job can move to another rider. */
export const PRE_PICKUP_STATUSES: TaskStatus[] = ["assigned", "accepted", "en_route_pickup", "arrived_pickup"];
export const ON_THE_WAY_STATUSES: TaskStatus[] = [
  "en_route",
  "en_route_pickup",
  "arrived_pickup",
  "picked_up",
  "en_route_dropoff",
  "arrived_dropoff",
];
export const DELIVERED_STATUSES: TaskStatus[] = ["delivered", "completed"];
export const CLOSED_STATUSES: TaskStatus[] = ["delivered", "completed", "failed", "cancelled", "returned"];

/** Board filters. The API OR-matches a comma-separated status list. */
export const TASK_FILTERS: Array<{ value: string; label: string; statuses: TaskStatus[] }> = [
  { value: "all", label: "All", statuses: [] },
  { value: "waiting", label: "Waiting", statuses: ["pending"] },
  { value: "assigned", label: "Assigned", statuses: ["assigned", "accepted"] },
  { value: "on_the_way", label: "On the way", statuses: ON_THE_WAY_STATUSES },
  { value: "delivered", label: "Delivered", statuses: DELIVERED_STATUSES },
  { value: "problems", label: "Failed or cancelled", statuses: ["failed", "cancelled", "returned"] },
];

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
