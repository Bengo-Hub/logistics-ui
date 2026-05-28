import { api } from "@/lib/api/client";
import type {
  CreateVehicleRequest,
  EarningsEntry,
  EarningsSummary,
  ETAResult,
  Fleet,
  FleetMember,
  GeoFence,
  LogisticsPermission,
  LogisticsRole,
  PaginatedResponse,
  PaginationParams,
  ProofOfDelivery,
  RouteResult,
  ServiceAuthMe,
  ServiceConfigMap,
  Task,
  TaskStatus,
  TelemetryStats,
  TrackingInfo,
  UserRoleAssignment,
  Vehicle,
} from "@/types/logistics";

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TasksParams extends PaginationParams {
  status?: TaskStatus | "all";
  zone_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  today?: boolean;
}

export async function fetchTasks(
  tenantSlug: string,
  params?: TasksParams
): Promise<PaginatedResponse<Task>> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.zone_id) qs.set("zone_id", params.zone_id);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.today) qs.set("today", "true");
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/tasks${query}`);
  if (Array.isArray(data)) {
    return { data, total: data.length, page: 1, limit: data.length, has_more: false };
  }
  return data as PaginatedResponse<Task>;
}

export async function fetchTask(tenantSlug: string, taskId: string): Promise<Task> {
  const { data } = await api.get(`${tenantSlug}/tasks/${taskId}`);
  return data;
}

export async function createTask(
  tenantSlug: string,
  body: {
    external_reference?: string;
    source_service?: string;
    task_type?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Task> {
  const { data } = await api.post(`${tenantSlug}/tasks`, body);
  return data;
}

export async function updateTaskStatus(
  tenantSlug: string,
  taskId: string,
  status: string
): Promise<Task> {
  const { data } = await api.patch(`${tenantSlug}/tasks/${taskId}/status`, { status });
  return data;
}

export async function assignTask(
  tenantSlug: string,
  taskId: string,
  fleetMemberId: string
): Promise<Task> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/assign`, {
    fleet_member_id: fleetMemberId,
  });
  return data;
}

export async function dispatchTask(tenantSlug: string, taskId: string): Promise<Task> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/dispatch`, {});
  return data;
}

export async function submitPoD(
  tenantSlug: string,
  taskId: string,
  formData: FormData
): Promise<ProofOfDelivery> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/pod`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function rateRider(
  tenantSlug: string,
  taskId: string,
  rating: number,
  comment?: string
): Promise<void> {
  await api.post(`${tenantSlug}/tasks/${taskId}/rate`, { rating, comment });
}

// ─── Fleet ────────────────────────────────────────────────────────────────────

export async function fetchFleet(tenantSlug: string): Promise<Fleet> {
  const { data } = await api.get(`${tenantSlug}/fleet`);
  return data;
}

export interface MembersParams extends PaginationParams {
  status?: string;
  search?: string;
}

export async function fetchMembers(
  tenantSlug: string,
  params?: MembersParams
): Promise<PaginatedResponse<FleetMember>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/fleet/members${query}`);
  if (Array.isArray(data)) {
    return { data, total: data.length, page: 1, limit: data.length, has_more: false };
  }
  return data as PaginatedResponse<FleetMember>;
}

export async function fetchMember(tenantSlug: string, memberId: string): Promise<FleetMember> {
  const { data } = await api.get(`${tenantSlug}/fleet/members/${memberId}`);
  return data;
}

export async function inviteMember(
  tenantSlug: string,
  body: { first_name: string; last_name: string; email: string; phone: string; role?: string }
): Promise<FleetMember> {
  const { data } = await api.post(`${tenantSlug}/fleet/members`, body);
  return data;
}

export async function approveMember(tenantSlug: string, memberId: string): Promise<FleetMember> {
  const { data } = await api.post(`${tenantSlug}/fleet/members/${memberId}/approve`);
  return data;
}

export async function suspendMember(tenantSlug: string, memberId: string): Promise<FleetMember> {
  const { data } = await api.post(`${tenantSlug}/fleet/members/${memberId}/suspend`);
  return data;
}

export async function rejectMember(
  tenantSlug: string,
  memberId: string,
  reason?: string
): Promise<FleetMember> {
  const { data } = await api.post(`${tenantSlug}/fleet/members/${memberId}/reject`, { reason });
  return data;
}

export async function deleteMember(tenantSlug: string, memberId: string): Promise<void> {
  await api.delete(`${tenantSlug}/fleet/members/${memberId}`);
}

export async function batchInviteMembers(
  tenantSlug: string,
  members: Array<{ first_name: string; last_name: string; email: string; phone: string }>
): Promise<FleetMember[]> {
  const { data } = await api.post(`${tenantSlug}/fleet/members/batch`, { members });
  return data;
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function createVehicle(
  tenantSlug: string,
  body: CreateVehicleRequest
): Promise<Vehicle> {
  const { data } = await api.post(`${tenantSlug}/fleet/vehicles`, body);
  return data;
}

export async function assignVehicle(
  tenantSlug: string,
  memberId: string,
  vehicleId: string
): Promise<void> {
  await api.post(`${tenantSlug}/fleet/members/${memberId}/vehicle`, { vehicle_id: vehicleId });
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export async function fetchZones(tenantSlug: string): Promise<GeoFence[]> {
  const { data } = await api.get(`${tenantSlug}/zones`);
  return Array.isArray(data) ? data : [];
}

export async function fetchZone(tenantSlug: string, zoneId: string): Promise<GeoFence> {
  const { data } = await api.get(`${tenantSlug}/zones/${zoneId}`);
  return data;
}

export async function createZone(
  tenantSlug: string,
  body: { name: string; zone_type?: string; status?: string; boundary: number[][]; color?: string }
): Promise<GeoFence> {
  const { data } = await api.post(`${tenantSlug}/zones`, body);
  return data;
}

export async function updateZone(
  tenantSlug: string,
  zoneId: string,
  body: Partial<{ name: string; zone_type: string; status: string; boundary: number[][]; color: string }>
): Promise<GeoFence> {
  const { data } = await api.patch(`${tenantSlug}/zones/${zoneId}`, body);
  return data;
}

export async function deleteZone(tenantSlug: string, zoneId: string): Promise<void> {
  await api.delete(`${tenantSlug}/zones/${zoneId}`);
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export async function fetchRoute(
  tenantSlug: string,
  params: { origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number }
): Promise<RouteResult> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const { data } = await api.get(`${tenantSlug}/routing/route?${qs.toString()}`);
  return data;
}

export async function fetchETA(
  tenantSlug: string,
  params: { origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number }
): Promise<ETAResult> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const { data } = await api.get(`${tenantSlug}/routing/eta?${qs.toString()}`);
  return data;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export async function trackByCode(
  tenantSlug: string,
  trackingCode: string
): Promise<TrackingInfo> {
  const { data } = await api.get(`${tenantSlug}/tracking/${trackingCode}`);
  return data;
}

export async function trackByCodePublic(trackingCode: string): Promise<TrackingInfo> {
  const baseUrl = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
  const { data } = await api.get(`${baseUrl}/track/${trackingCode}`);
  return data;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export async function fetchTelemetry(
  tenantSlug: string,
  params?: { period?: string; fleet_member_id?: string }
): Promise<TelemetryStats> {
  const qs = new URLSearchParams();
  if (params?.period) qs.set("period", params.period);
  if (params?.fleet_member_id) qs.set("fleet_member_id", params.fleet_member_id);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/telemetry${query}`);
  return data;
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export interface EarningsParams extends PaginationParams {
  fleet_member_id?: string;
  status?: string;
  period_start?: string;
  period_end?: string;
}

export async function fetchEarnings(
  tenantSlug: string,
  params?: EarningsParams
): Promise<PaginatedResponse<EarningsEntry>> {
  const qs = new URLSearchParams();
  if (params?.fleet_member_id) qs.set("fleet_member_id", params.fleet_member_id);
  if (params?.status) qs.set("status", params.status);
  if (params?.period_start) qs.set("period_start", params.period_start);
  if (params?.period_end) qs.set("period_end", params.period_end);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/earnings${query}`);
  if (Array.isArray(data)) {
    return { data, total: data.length, page: 1, limit: data.length, has_more: false };
  }
  return data as PaginatedResponse<EarningsEntry>;
}

export async function fetchEarningsSummary(
  tenantSlug: string,
  params?: { fleet_member_id?: string; period?: string }
): Promise<EarningsSummary> {
  const qs = new URLSearchParams();
  if (params?.fleet_member_id) qs.set("fleet_member_id", params.fleet_member_id);
  if (params?.period) qs.set("period", params.period);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/earnings/summary${query}`);
  return data;
}

// ─── Service Config ───────────────────────────────────────────────────────────

export async function fetchServiceConfig(tenantSlug: string): Promise<ServiceConfigMap> {
  const { data } = await api.get(`${tenantSlug}/service-config`);
  return data;
}

export async function updateServiceConfig(
  tenantSlug: string,
  body: Partial<ServiceConfigMap>
): Promise<ServiceConfigMap> {
  const { data } = await api.patch(`${tenantSlug}/service-config`, body);
  return data;
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export async function fetchRoles(tenantSlug: string): Promise<LogisticsRole[]> {
  const { data } = await api.get(`${tenantSlug}/rbac/roles`);
  return Array.isArray(data) ? data : [];
}

export async function fetchRole(tenantSlug: string, roleId: string): Promise<LogisticsRole> {
  const { data } = await api.get(`${tenantSlug}/rbac/roles/${roleId}`);
  return data;
}

export async function fetchPermissions(tenantSlug: string): Promise<LogisticsPermission[]> {
  const { data } = await api.get(`${tenantSlug}/rbac/permissions`);
  return Array.isArray(data) ? data : [];
}

export async function assignRoleToUser(
  tenantSlug: string,
  userId: string,
  roleId: string
): Promise<UserRoleAssignment> {
  const { data } = await api.post(`${tenantSlug}/rbac/assignments`, {
    user_id: userId,
    role_id: roleId,
  });
  return data;
}

export async function revokeRoleFromUser(
  tenantSlug: string,
  userId: string,
  roleId: string
): Promise<void> {
  await api.delete(`${tenantSlug}/rbac/assignments`, {
    data: { user_id: userId, role_id: roleId },
  });
}

export async function fetchUserAssignments(
  tenantSlug: string,
  userId?: string
): Promise<UserRoleAssignment[]> {
  const query = userId ? `?user_id=${userId}` : "";
  const { data } = await api.get(`${tenantSlug}/rbac/assignments${query}`);
  return Array.isArray(data) ? data : [];
}

// ─── Auth / Trinity Layer 3 ───────────────────────────────────────────────────

export async function fetchAuthMe(tenantSlug: string): Promise<ServiceAuthMe> {
  const { data } = await api.get(`${tenantSlug}/auth/me`);
  return data;
}
