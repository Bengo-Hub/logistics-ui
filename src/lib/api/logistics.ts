import { api } from "@/lib/api/client";
import type {
  AddCustodyEventRequest,
  ChainOfCustody,
  CreateShipmentRequest,
  CreateShiftRequest,
  CreateVehicleRequest,
  EarningsEntry,
  EarningsSummary,
  ETAResult,
  Fleet,
  FleetMember,
  DeliveryCoverage,
  DeliveryPolicy,
  DeliveryPolicyView,
  DeliveryQuote,
  GeoFence,
  GeoPlace,
  InsuranceInput,
  InsuranceView,
  LogisticsNotification,
  LogisticsPermission,
  LogisticsRole,
  PaginatedResponse,
  PaginationParams,
  ProofOfDelivery,
  RiderShift,
  RouteResult,
  ServiceAuthMe,
  ServiceConfigEntry,
  ServiceConfigMap,
  Shipment,
  Task,
  TaskAssignment,
  TaskStatus,
  TelemetryStats,
  TrackingInfo,
  UserRoleAssignment,
  Vehicle,
  VehicleStatus,
  VehicleType,
  ZoneInput,
  ZoneStat,
} from "@/types/logistics";

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TasksParams extends PaginationParams {
  /** A single TaskStatus, "all", or several comma-joined to OR-match a board filter (see
   * logistics-api's ListTasksFilter.Statuses). Plain string to allow the joined form. */
  status?: string;
  /** RFC3339 */
  date_from?: string;
  date_to?: string;
  search?: string;
  /** Fleet member id: jobs this rider was assigned. */
  rider_id?: string;
}

export async function fetchTasks(
  tenantSlug: string,
  params?: TasksParams
): Promise<PaginatedResponse<Task>> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.rider_id) qs.set("rider_id", params.rider_id);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/tasks${query}`);
  if (Array.isArray(data)) {
    return { data, total: data.length, page: 1, limit: data.length, hasMore: false };
  }
  return data as PaginatedResponse<Task>;
}

export async function fetchTask(tenantSlug: string, taskId: string): Promise<Task> {
  const { data } = await api.get(`${tenantSlug}/tasks/${taskId}`);
  return data;
}

/** tasks.CreateTaskRequest. The pickup_* and dropoff_* fields create the task's stops. */
export interface CreateTaskBody {
  external_reference?: string;
  source_service?: string;
  task_type?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
  pickup_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_contact?: string;
  dropoff_address?: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_contact?: string;
  customer_name?: string;
  customer_phone?: string;
  instructions?: string;
}

export async function createTask(tenantSlug: string, body: CreateTaskBody): Promise<Task> {
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

/** AssignTask (logistics.go) responds with the raw created TaskAssignment, not a Task —
 * refetch the task (query invalidation) to see assigned_rider_id update on it. */
export async function assignTask(
  tenantSlug: string,
  taskId: string,
  fleetMemberId: string,
  reassign = false
): Promise<TaskAssignment> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/assign`, {
    fleet_member_id: fleetMemberId,
    ...(reassign ? { reassign: true } : {}),
  });
  return data;
}

/** Take a job back from its rider before pickup; it returns to the open pool. */
export async function unassignTask(tenantSlug: string, taskId: string, reason: string): Promise<Task> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/unassign`, { reason });
  return data;
}

/** Cancel a delivery that will not happen (the rider is freed; the reason is kept). */
export async function cancelTask(tenantSlug: string, taskId: string, reason: string): Promise<Task> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/cancel`, { reason });
  return data;
}

/** Per diem outcome kept on a task (metadata.per_diem_claim); the claim itself is in HR. */
export interface PerDiemClaim {
  status: "raised" | "skipped" | "failed";
  claim_id?: string;
  amount?: string;
  days?: number;
  code?: string;
  message?: string;
  updated_at?: string;
}

/** Raises (or re-raises) the staff rider's per diem for a task in HR payroll (erp-api). */
export async function raisePerDiem(tenantSlug: string, taskId: string, days: number): Promise<PerDiemClaim> {
  const { data } = await api.post(`${tenantSlug}/tasks/${taskId}/per-diem`, days > 0 ? { days } : {});
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

/** GET .../tasks/{taskId}/pod — 404s until proof of delivery has actually been submitted;
 * TaskResponse itself never carries PoD data, this is the only way to fetch it. */
export async function fetchTaskPod(
  tenantSlug: string,
  taskId: string
): Promise<ProofOfDelivery> {
  const { data } = await api.get(`${tenantSlug}/tasks/${taskId}/pod`);
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
    return { data, total: data.length, page: 1, limit: data.length, hasMore: false };
  }
  return data as PaginatedResponse<FleetMember>;
}

export async function fetchMember(tenantSlug: string, memberId: string): Promise<FleetMember> {
  const { data } = await api.get(`${tenantSlug}/fleet/members/${memberId}`);
  return data;
}

/** freelance riders are external; staff riders are internal employees HR has already vetted. */
export type EmploymentType = "freelance" | "staff";

/**
 * How a rider is paid. Payroll riders draw a salary in HR payroll (no per-delivery pay); earning
 * rules riders are paid per delivery from the rider pricing rules. Freelance is always earning rules.
 */
export type PayBasis = "payroll" | "earning_rules";

export interface Employment {
  type: EmploymentType;
  pay_basis?: PayBasis;
}

export const PAY_BASIS_LABEL: Record<PayBasis, string> = {
  payroll: "Salary (payroll)",
  earning_rules: "Per delivery (earning rules)",
};

export interface InviteMemberBody {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  id_number?: string;
  license_no?: string;
  employment?: Employment;
}

export async function inviteMember(tenantSlug: string, body: InviteMemberBody): Promise<FleetMember> {
  const { data } = await api.post(`${tenantSlug}/fleet/members`, body);
  return data;
}

export async function setMemberEmployment(
  tenantSlug: string,
  memberId: string,
  body: Employment
): Promise<FleetMember> {
  const { data } = await api.put(`${tenantSlug}/fleet/members/${memberId}/employment`, body);
  return data;
}

/** Reads a member's employment terms from metadata; members without terms are freelance on earning rules. */
export function memberEmployment(m: Pick<FleetMember, "metadata">): Required<Employment> {
  const raw = (m.metadata?.employment ?? {}) as Partial<Employment> & { per_task_earnings?: boolean };
  if (raw.type !== "staff") return { type: "freelance", pay_basis: "earning_rules" };
  // per_task_earnings is the flag pay_basis replaced; riders saved with it keep their pay.
  const rules = raw.pay_basis === "earning_rules" || (raw.pay_basis == null && raw.per_task_earnings === true);
  return { type: "staff", pay_basis: rules ? "earning_rules" : "payroll" };
}

/** A direct onboarding of an internal rider: the admin fills everything in, no invite needed. */
export interface OnboardRiderBody {
  first_name: string;
  last_name?: string;
  email: string;
  phone: string;
  id_number: string;
  license_no?: string;
  pay_basis: PayBasis;
  /** Link an existing fleet vehicle, or register a new one; never both. */
  vehicle_id?: string;
  /** A new vehicle, with its insurance when recorded now (member_id is set by the API). */
  vehicle?: Omit<CreateVehicleRequest, "member_id">;
  /** Email the rider their sign-in details, with the temporary password for a new account. */
  send_invite?: boolean;
}

/**
 * The new rider plus the sign-in details shown to the admin once. temp_password is present only
 * when the platform account was created now (it is never stored); existing_account means the
 * rider signs in with the password they already have.
 */
export interface OnboardRiderResult extends FleetMember {
  temp_password?: string;
  existing_account: boolean;
  email_sent: boolean;
}

export async function onboardRider(tenantSlug: string, body: OnboardRiderBody): Promise<OnboardRiderResult> {
  const { data } = await api.post(`${tenantSlug}/fleet/members/onboard`, body);
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

/** One row of a batch invite: the API answers 200 with an error on rows it could not invite. */
export interface BatchInviteResult {
  email: string;
  member?: FleetMember;
  error?: string;
}

export async function batchInviteMembers(
  tenantSlug: string,
  members: InviteMemberBody[]
): Promise<BatchInviteResult[]> {
  const { data } = await api.post(`${tenantSlug}/fleet/members/batch`, { members });
  return data;
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function createVehicle(
  tenantSlug: string,
  body: CreateVehicleRequest
): Promise<FleetVehicle> {
  const { data } = await api.post(`${tenantSlug}/fleet/vehicles`, body);
  return data;
}

/** A fleet vehicle with the rider it is linked to (absent when it is free). */
export interface FleetVehicle extends Vehicle {
  assigned_to?: { member_id: string; name: string; phone?: string };
  chassis_no?: string;
  insurance?: InsuranceView;
}

/** Whole-fleet counts, computed by the API (not just the loaded page). */
export interface VehicleSummary {
  active: number;
  maintenance: number;
  inactive: number;
  assigned: number;
  unassigned: number;
  insurance_expired: number;
  insurance_expiring: number;
  insurance_missing: number;
}

/** Records or renews a vehicle's policy; a vehicle deactivated for an expired policy is reactivated. */
export async function recordVehicleInsurance(
  tenantSlug: string,
  vehicleId: string,
  body: InsuranceInput
): Promise<FleetVehicle> {
  const { data } = await api.put(`${tenantSlug}/fleet/vehicles/${vehicleId}/insurance`, body);
  return data;
}

/** Uploads a photo or PDF (max 5 MB) and returns its reference. */
export async function uploadMedia(tenantSlug: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`${tenantSlug}/media/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.url ?? "";
}

export interface VehiclesParams extends PaginationParams {
  search?: string;
  status?: VehicleStatus;
  assigned?: boolean;
}

export async function fetchVehicles(
  tenantSlug: string,
  params?: VehiclesParams
): Promise<PaginatedResponse<FleetVehicle> & { summary: VehicleSummary }> {
  const { data } = await api.get(`${tenantSlug}/fleet/vehicles`, { params });
  return data;
}

/** Links a vehicle to a rider; null unlinks the rider's vehicle. */
export async function assignVehicle(
  tenantSlug: string,
  memberId: string,
  vehicleId: string | null
): Promise<void> {
  await api.post(`${tenantSlug}/fleet/members/${memberId}/vehicle`, { vehicle_id: vehicleId ?? "" });
}

export async function updateVehicle(
  tenantSlug: string,
  vehicleId: string,
  body: Partial<Pick<CreateVehicleRequest, "vehicle_type" | "make" | "model" | "license_plate">> & {
    status?: VehicleStatus;
  }
): Promise<Vehicle> {
  const { data } = await api.patch(`${tenantSlug}/fleet/vehicles/${vehicleId}`, body);
  return data;
}

export async function deleteVehicle(tenantSlug: string, vehicleId: string): Promise<void> {
  await api.delete(`${tenantSlug}/fleet/vehicles/${vehicleId}`);
}

// ─── Notifications ──────────────────────────────────────────────────────────────

export async function fetchNotifications(
  tenantSlug: string,
  includeRead = false
): Promise<{ data: LogisticsNotification[]; total: number }> {
  const { data } = await api.get(`${tenantSlug}/notifications`, {
    params: includeRead ? { include_read: "true" } : undefined,
  });
  return { data: data?.data ?? [], total: data?.total ?? 0 };
}

export async function markNotificationRead(tenantSlug: string, id: string): Promise<void> {
  await api.patch(`${tenantSlug}/notifications/${id}/read`);
}

export async function markAllNotificationsRead(tenantSlug: string): Promise<{ marked_read: number }> {
  const { data } = await api.post(`${tenantSlug}/notifications/mark-all-read`);
  return data;
}

// ─── Zones, delivery policy, quotes and geocoding ─────────────────────────────

export async function fetchZones(tenantSlug: string): Promise<GeoFence[]> {
  const { data } = await api.get(`${tenantSlug}/zones`);
  return Array.isArray(data) ? data : [];
}

export async function fetchZone(tenantSlug: string, zoneId: string): Promise<GeoFence> {
  const { data } = await api.get(`${tenantSlug}/zones/${zoneId}`);
  return data;
}

export async function createZone(tenantSlug: string, body: ZoneInput): Promise<GeoFence> {
  const { data } = await api.post(`${tenantSlug}/zones`, body);
  return data;
}

export async function updateZone(tenantSlug: string, zoneId: string, body: Partial<ZoneInput>): Promise<GeoFence> {
  const { data } = await api.patch(`${tenantSlug}/zones/${zoneId}`, body);
  return data;
}

export async function deleteZone(tenantSlug: string, zoneId: string): Promise<void> {
  await api.delete(`${tenantSlug}/zones/${zoneId}`);
}

export async function fetchDeliveryPolicy(tenantSlug: string): Promise<DeliveryPolicyView> {
  const { data } = await api.get(`${tenantSlug}/delivery-policy`);
  return data;
}

export async function saveDeliveryPolicy(tenantSlug: string, policy: DeliveryPolicy): Promise<DeliveryPolicyView> {
  const { data } = await api.put(`${tenantSlug}/delivery-policy`, policy);
  return data;
}

/** Drops the tenant's own policy so it follows the platform default again. */
export async function resetDeliveryPolicy(tenantSlug: string): Promise<DeliveryPolicyView> {
  const { data } = await api.delete(`${tenantSlug}/delivery-policy`);
  return data;
}

/** The platform default policy every tenant without its own uses (platform owners only). */
export async function fetchPlatformDeliveryPolicy(): Promise<DeliveryPolicyView> {
  const { data } = await api.get(`admin/delivery-policy`);
  return data;
}

export async function savePlatformDeliveryPolicy(policy: DeliveryPolicy): Promise<DeliveryPolicyView> {
  const { data } = await api.put(`admin/delivery-policy`, policy);
  return data;
}

export async function fetchDeliveryQuote(
  tenantSlug: string,
  params: { lat: number; lng: number; outlet_id?: string; order_total?: number },
): Promise<DeliveryQuote> {
  const { data } = await api.get(`${tenantSlug}/zones/quote`, { params });
  return data;
}

export async function fetchDeliveryCoverage(tenantSlug: string): Promise<DeliveryCoverage> {
  const { data } = await api.get(`${tenantSlug}/zones/coverage`);
  return data;
}

export async function searchPlaces(tenantSlug: string, q: string): Promise<GeoPlace[]> {
  const { data } = await api.get(`${tenantSlug}/routing/geocode/search`, { params: { q } });
  return Array.isArray(data) ? data : [];
}

export async function reversePlace(tenantSlug: string, lat: number, lng: number): Promise<GeoPlace> {
  const { data } = await api.get(`${tenantSlug}/routing/geocode/reverse`, { params: { lat, lng } });
  return data;
}

export async function fetchZoneStats(tenantSlug: string, period = "30d"): Promise<ZoneStat[]> {
  const { data } = await api.get(`${tenantSlug}/analytics/zones`, { params: { period } });
  return Array.isArray(data) ? data : [];
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
    return { data, total: data.length, page: 1, limit: data.length, hasMore: false };
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
// GET/PUT here are per-key (config_handler.go has no bulk PATCH /settings endpoint).
// Every real key is seeded with the "logistics." prefix (cmd/seed/main.go); the map
// keys used across the UI are the same names with that prefix stripped.

const SERVICE_CONFIG_PREFIX = "logistics.";

function parseConfigValue(value: string, type: string): unknown {
  if (type === "bool") return value === "true";
  if (type === "int" || type === "float") return Number(value);
  if (type === "json") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export async function fetchServiceConfig(tenantSlug: string): Promise<ServiceConfigMap> {
  const { data } = await api.get(`${tenantSlug}/settings`);
  const rows: ServiceConfigEntry[] = Array.isArray(data?.data) ? data.data : [];
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.config_key.startsWith(SERVICE_CONFIG_PREFIX)
      ? row.config_key.slice(SERVICE_CONFIG_PREFIX.length)
      : row.config_key;
    map[key] = parseConfigValue(row.config_value, row.config_type);
  }
  return map as ServiceConfigMap;
}

export async function updateServiceConfig(
  tenantSlug: string,
  changes: Partial<ServiceConfigMap>
): Promise<ServiceConfigMap> {
  const entries = Object.entries(changes).filter(([, v]) => v !== undefined);
  await Promise.all(
    entries.map(([key, value]) =>
      api.put(`${tenantSlug}/settings/${SERVICE_CONFIG_PREFIX}${key}`, {
        config_value: String(value),
      })
    )
  );
  return fetchServiceConfig(tenantSlug);
}

/** Settings rows as stored: the tenant's own value (is_override) or the platform default. */
export async function fetchSettingRows(tenantSlug: string): Promise<ServiceConfigEntry[]> {
  const { data } = await api.get(`${tenantSlug}/settings`);
  return Array.isArray(data?.data) ? data.data : [];
}

/** Saves the tenant's own value for one setting key (full key, e.g. logistics.block_expired_insurance). */
export async function saveSetting(tenantSlug: string, key: string, value: string): Promise<void> {
  await api.put(`${tenantSlug}/settings/${key}`, { config_value: value });
}

/** Drops the tenant's own value so the platform default applies again. */
export async function resetSetting(tenantSlug: string, key: string): Promise<void> {
  await api.delete(`${tenantSlug}/settings/${key}`);
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export async function fetchRoles(tenantSlug: string): Promise<LogisticsRole[]> {
  const { data } = await api.get(`${tenantSlug}/rbac/roles`);
  return data?.roles ?? [];
}

export async function fetchPermissions(tenantSlug: string): Promise<LogisticsPermission[]> {
  const { data } = await api.get(`${tenantSlug}/rbac/permissions`);
  return data?.permissions ?? [];
}

export async function assignRoleToUser(tenantSlug: string, userId: string, roleId: string): Promise<void> {
  await api.post(`${tenantSlug}/rbac/assignments`, { user_id: userId, role_id: roleId });
}

export async function revokeAssignment(tenantSlug: string, assignmentId: string): Promise<void> {
  await api.delete(`${tenantSlug}/rbac/assignments/${assignmentId}`);
}

export async function fetchUserAssignments(tenantSlug: string, userId?: string): Promise<UserRoleAssignment[]> {
  const { data } = await api.get(`${tenantSlug}/rbac/assignments`, { params: userId ? { user_id: userId } : undefined });
  return data?.assignments ?? [];
}

// ─── Auth / Trinity Layer 3 ───────────────────────────────────────────────────

export async function fetchAuthMe(tenantSlug: string): Promise<ServiceAuthMe> {
  const { data } = await api.get(`${tenantSlug}/auth/me`);
  return data;
}

// ─── Distribution / KEMSA Shipments ─────────────────────────────────────────

export async function fetchShipments(
  tenantSlug: string,
  params?: { status?: string; limit?: number }
): Promise<{ data: Shipment[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/shipments${query}`);
  return data;
}

export async function fetchShipment(tenantSlug: string, shipmentId: string): Promise<Shipment> {
  const { data } = await api.get(`${tenantSlug}/shipments/${shipmentId}`);
  return data;
}

export async function createShipment(
  tenantSlug: string,
  req: CreateShipmentRequest
): Promise<Shipment> {
  const { data } = await api.post(`${tenantSlug}/shipments`, req);
  return data;
}

export async function dispatchShipment(tenantSlug: string, shipmentId: string): Promise<Shipment> {
  const { data } = await api.post(`${tenantSlug}/shipments/${shipmentId}/dispatch`, {});
  return data;
}

export async function updateShipmentStatus(
  tenantSlug: string,
  shipmentId: string,
  status: string
): Promise<Shipment> {
  const { data } = await api.patch(`${tenantSlug}/shipments/${shipmentId}/status`, { status });
  return data;
}

export async function fetchCustodyEvents(
  tenantSlug: string,
  shipmentId: string
): Promise<{ data: ChainOfCustody[]; total: number }> {
  const { data } = await api.get(`${tenantSlug}/shipments/${shipmentId}/custody`);
  return data;
}

export async function addCustodyEvent(
  tenantSlug: string,
  shipmentId: string,
  req: AddCustodyEventRequest
): Promise<ChainOfCustody> {
  const { data } = await api.post(`${tenantSlug}/shipments/${shipmentId}/custody`, req);
  return data;
}

// ─── Module Access ────────────────────────────────────────────────────────────

export interface ModulesConfig {
  enabled_modules: string[];
  all_modules: string[];
  use_case_defaults: Record<string, string[]>;
}

export async function fetchModulesConfig(tenantSlug: string): Promise<ModulesConfig> {
  const { data } = await api.get(`${tenantSlug}/settings/modules`);
  return data;
}

export async function updateModulesConfig(
  tenantSlug: string,
  enabledModules: string[]
): Promise<{ enabled_modules: string[] }> {
  const { data } = await api.put(`${tenantSlug}/settings/modules`, {
    enabled_modules: enabledModules,
  });
  return data;
}

// ─── Rider Shifts ─────────────────────────────────────────────────────────────

export interface ShiftsParams {
  fleet_member_id?: string;
  status?: string;
  /** RFC3339; shifts overlapping [from, to]. */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function fetchShifts(
  tenantSlug: string,
  params?: ShiftsParams
): Promise<{ data: RiderShift[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.fleet_member_id) qs.set("fleet_member_id", params.fleet_member_id);
  if (params?.status) qs.set("status", params.status);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const { data } = await api.get(`${tenantSlug}/shifts${query}`);
  return Array.isArray(data) ? { data, total: data.length } : data;
}

export async function createShift(
  tenantSlug: string,
  req: CreateShiftRequest
): Promise<RiderShift> {
  const { data } = await api.post(`${tenantSlug}/shifts`, req);
  return data;
}

export async function startShift(tenantSlug: string, shiftId: string): Promise<RiderShift> {
  const { data } = await api.post(`${tenantSlug}/shifts/${shiftId}/start`, {});
  return data;
}

export async function endShift(tenantSlug: string, shiftId: string): Promise<RiderShift> {
  const { data } = await api.post(`${tenantSlug}/shifts/${shiftId}/end`, {});
  return data;
}

export async function cancelShift(tenantSlug: string, shiftId: string): Promise<RiderShift> {
  const { data } = await api.post(`${tenantSlug}/shifts/${shiftId}/cancel`, {});
  return data;
}

export async function deleteShift(tenantSlug: string, shiftId: string): Promise<void> {
  await api.delete(`${tenantSlug}/shifts/${shiftId}`);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/** Report periods: calendar days in the business's time zone, today included. */
export type KPIPeriod = "today" | "7d" | "30d" | "90d";

export interface KPIResponse {
  period: KPIPeriod;
  total_tasks: number;
  pending_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  cancelled_tasks: number;
  on_time_percent: number;
  active_riders: number;
  total_riders: number;
  /** Riders who held at least one job created in the period. */
  riders_working: number;
  /** riders_working as a share of active riders. */
  utilization_percent: number;
  avg_delivery_minutes: number;
}

/** One hour (today) or day of task outcomes. */
export interface SeriesPoint {
  start: string;
  total: number;
  delivered: number;
  failed: number;
  cancelled: number;
}

export interface SeriesResponse {
  period: KPIPeriod;
  unit: "hour" | "day";
  points: SeriesPoint[];
}

export async function fetchSeries(tenantSlug: string, period: KPIPeriod): Promise<SeriesResponse> {
  const { data } = await api.get(`${tenantSlug}/analytics/series`, { params: { period } });
  return data;
}

/** One rider's jobs in the period (top 50 by deliveries). */
export interface RiderStat {
  fleet_member_id: string;
  name: string;
  jobs: number;
  delivered: number;
  failed: number;
  avg_delivery_minutes: number;
  on_time_percent: number;
  average_rating: number;
  ratings: number;
}

export async function fetchRiderStats(tenantSlug: string, period: KPIPeriod): Promise<RiderStat[]> {
  const { data } = await api.get(`${tenantSlug}/analytics/riders`, { params: { period } });
  return Array.isArray(data) ? data : [];
}

export async function fetchKPIs(tenantSlug: string, period?: KPIPeriod): Promise<KPIResponse> {
  const qs = period ? `?period=${period}` : "";
  const { data } = await api.get(`${tenantSlug}/analytics/kpis${qs}`);
  return data;
}
