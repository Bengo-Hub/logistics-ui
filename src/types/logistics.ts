/** Fleet member (rider/driver) from logistics-api */
export interface FleetMember {
  id: string;
  tenant_id: string;
  fleet_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: FleetMemberStatus;
  role: string;
  driver_code?: string;
  id_passport_number?: string;
  id_passport_attachment?: string;
  rider_photo?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  average_rating: number;
  total_ratings: number;
  specialization_tags?: string[];
  has_cold_storage?: boolean;
  max_weight_capacity_kg?: number | null;
  metadata: Record<string, unknown>;
  joined_at: string;
  created_at: string;
  updated_at: string;
  /** FleetMemberResponse (fleet_dto.go) only ever populates `vehicles` — there is no
   * `fleet` edge in the actual response; never add one back without checking the DTO first. */
  edges?: {
    vehicles?: Vehicle[];
  };
}

export type FleetMemberStatus = "pending" | "active" | "suspended" | "rejected";

export interface FleetMembership {
  id: string;
  status: FleetMemberStatus;
  edges?: {
    vehicle?: Vehicle;
  };
}

/** Fleet entity */
export interface Fleet {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  name: string;
  type: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: {
    members?: FleetMember[];
    vehicles?: Vehicle[];
  };
}

/** Vehicle entity */
export interface Vehicle {
  id: string;
  tenant_id: string;
  fleet_id: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  license_plate: string;
  capacity_json?: Record<string, unknown>;
  status: VehicleStatus;
  compliance_status: string;
  image_license_plate?: string;
  image_side_view?: string;
  insurance_expiry?: string | null;
  inspection_expiry?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: {
    members?: FleetMember[];
  };
}

export type VehicleType = "motorcycle" | "bicycle" | "car" | "van" | "truck" | "other";
export type VehicleStatus = "active" | "inactive" | "maintenance";

export interface CreateVehicleRequest {
  vehicle_type: VehicleType;
  make: string;
  model: string;
  license_plate: string;
  metadata?: Record<string, unknown>;
}

/**
 * Delivery task from logistics-api. Matches the flattened TaskResponse DTO
 * (internal/http/handlers/task_dto.go) returned by GetTask, ListTasks, ListMyTasks,
 * UpdateTaskStatus and AssignTask — the raw ent.Task and its steps/assignments edges are
 * NEVER sent over the wire; pickup/dropoff step data and the current assignment are
 * flattened into these top-level pickup-, dropoff- and assigned-prefixed fields instead.
 * Proof of delivery is not included here at all — fetch it separately via
 * GET tasks/{id}/pod (see fetchTaskPod, useTaskPod), which 404s until PoD has actually
 * been submitted.
 */
export interface Task {
  id: string;
  tenant_id: string;
  tenant_slug?: string;
  tracking_code?: string;
  external_reference: string;
  external_type: string;
  status: TaskStatus;
  priority: TaskPriority;
  sla_due_at: string | null;
  requested_pickup_at: string | null;
  requested_dropoff_at: string | null;
  assigned_rider_id: string | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_notes: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_notes: string;
  dropoff_contact_name: string;
  dropoff_contact_phone: string;
  customer_name: string;
  customer_phone: string;
  instructions: string;
  items_description: string;
  item_count: number;
  /** Source order number (ordering/POS), what the outlet and customer know the order by. */
  order_number?: string;
  payment_method?: string;
  cash_on_delivery: number;
  distance_km: number | null;
  eta_minutes: number | null;
  eta_at: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  failure_reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = "normal" | "high" | "urgent";

export type TaskStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "en_route"
  | "en_route_pickup"
  | "arrived_pickup"
  | "picked_up"
  | "en_route_dropoff"
  | "arrived_dropoff"
  | "delivered"
  | "completed"
  | "failed"
  | "cancelled";

/** Task step (pickup/dropoff location) */
export interface TaskStep {
  id: string;
  task_id: string;
  step_type: "pickup" | "dropoff" | "hub";
  sequence: number;
  location_name: string;
  address_json: Record<string, unknown> | null;
  contact_name: string;
  contact_phone: string;
  requires_signature: boolean;
  requires_photo: boolean;
  metadata: Record<string, unknown>;
}

/** Task event (audit trail) */
export interface TaskEvent {
  id: string;
  task_id: string;
  event_type: string;
  actor_id: string;
  actor_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

/** Task assignment */
export interface TaskAssignment {
  id: string;
  task_id: string;
  fleet_member_id: string;
  status: string;
  assigned_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  edges?: {
    fleet_member?: FleetMember;
  };
}

/** Proof of delivery */
export interface ProofOfDelivery {
  id: string;
  task_id: string;
  fleet_member_id: string;
  signature_url: string;
  photo_url: string;
  otp_code: string;
  notes: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** SSE event types from /{tenant}/tasks/{taskId}/stream */
export type SSEEventType = "connected" | "status_changed" | "eta_updated" | "heartbeat";

export interface SSEEvent {
  type: SSEEventType;
  task_id?: string;
  status?: TaskStatus;
  eta?: string;
  at?: string;
}

/** Tracking info from public endpoint */
export interface TrackingInfo {
  tracking_code: string;
  status: TaskStatus;
  task_type: string;
  status_history: StatusHistoryEntry[];
  rider: { id: string; status: string } | null;
  pickup_location: string;
  pickup_address: Record<string, unknown> | null;
  dropoff_location: string;
  dropoff_address: Record<string, unknown> | null;
  live_tracking_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  status: string;
  at: string;
  label: string;
}

/** Delivery settings of a zone (logistics-api zones.ZoneSettings, stored in metadata). */
export interface ZoneSettings {
  shape: "circle" | "polygon";
  center?: { lat: number; lng: number } | null;
  radius_m?: number;
  fee: number;
  free: boolean;
  currency?: string;
  min_order: number;
  eta_minutes?: number;
  priority: number;
  outlet_ids?: string[];
  aliases?: string[];
  notes?: string;
}

export type ZoneType = "delivery" | "exclusion" | "pickup" | "surge";
export type ZoneStatus = "active" | "inactive" | "draft";

/** Delivery zone (geo-fence) */
export interface GeoFence {
  id: string;
  tenant_id: string;
  name: string;
  zone_type: ZoneType | string;
  status: ZoneStatus | string;
  /** Closed ring of [lng, lat]. */
  boundary: number[][];
  color: string;
  settings: ZoneSettings;
  area_km2: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Body for creating or replacing a zone. */
export interface ZoneInput {
  name: string;
  zone_type: string;
  status: string;
  color: string;
  boundary?: number[][];
  settings: ZoneSettings;
}

/** Customer delivery pricing and geofence policy (logistics.delivery_quote_policy). */
export interface DeliveryPolicy {
  fallback: "per_km" | "none";
  buffer_km: number;
  max_radius_km?: number | null;
  require_zones: boolean;
  base_fee: number;
  per_km_rate: number;
  min_fee: number;
  rounding: number;
  distance_source: "road" | "straight";
  road_factor_fallback: number;
  speed_kmh: number;
  prep_minutes: number;
  currency: string;
  quote_cache_seconds: number;
}

export interface DeliveryPolicyView {
  policy: DeliveryPolicy;
  source: "tenant" | "platform" | "default";
  updated_at?: string;
}

export interface ZoneRef {
  id: string;
  name: string;
}

export interface OutletPoint {
  id: string;
  name: string;
  location: { lat: number; lng: number };
}

/** Delivery quote. The fee is authoritative. */
export interface DeliveryQuote {
  serviceable: boolean;
  reason?: string;
  method?: "zone" | "per_km";
  fee: number;
  free: boolean;
  currency: string;
  zone?: ZoneRef;
  nearest_area?: ZoneRef;
  nearest_area_km?: number;
  distance_km: number;
  distance_type?: "road" | "estimated" | "straight";
  eta_minutes?: number;
  min_order: number;
  below_min_order?: boolean;
  outlet?: OutletPoint;
  breakdown?: { base_fee: number; per_km_rate: number; raw: number; min_fee: number; rounding: number };
  policy_version: string;
  cache_seconds: number;
}

export interface DeliveryCoverage {
  zones: { id: string; name: string; zone_type: string; color: string; fee: number; free: boolean; center?: { lat: number; lng: number }; aliases?: string[]; boundary: number[][] }[];
  outlets: OutletPoint[];
  bounds?: [number, number, number, number];
  center?: { lat: number; lng: number };
  min_fee: number;
  has_free_zone: boolean;
  currency: string;
  policy: { fallback: string; buffer_km: number; per_km_rate: number };
  policy_version: string;
}

/** Place from the geocode proxy. */
export interface GeoPlace {
  name: string;
  display_name: string;
  location: { lat: number; lng: number };
  kind?: string;
  source: "zone" | "geocoder";
  area?: ZoneRef;
  area_km?: number;
}

/** Deliveries by zone report row. */
export interface ZoneStat {
  zone_id: string;
  zone_name: string;
  tasks: number;
  delivered: number;
  failed: number;
  cancelled: number;
  delivery_fees: number;
  avg_distance_km: number;
  avg_delivery_minutes: number;
  on_time_percent: number;
}

/** Telemetry (GPS) data point */
export interface TelemetryPoint {
  id: string;
  fleet_member_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  battery_level: number;
  recorded_at: string;
}

export interface TelemetryStats {
  period: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  success_rate: number;
  avg_delivery_time_minutes: number;
  active_riders: number;
}

/** Earnings */
export interface EarningsEntry {
  id: string;
  tenant_id: string;
  fleet_member_id: string;
  task_id: string;
  amount: string;
  currency: string;
  status: EarningsStatus;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: {
    fleet_member?: FleetMember;
    task?: Task;
  };
}

export type EarningsStatus = "pending" | "approved" | "paid" | "disputed";

export interface EarningsSummary {
  total: string;
  pending: string;
  approved: string;
  paid: string;
  currency: string;
  period: string;
}

/** Service config */
export interface ServiceConfig {
  id: string;
  tenant_id: string;
  key: string;
  value: unknown;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

/** Raw row shape from GET /{tenant}/settings (config_handler.go's logisticsSCResponse).
 * config_key carries the "logistics." prefix as stored; config_value is always a string,
 * typed per config_type ("bool" | "int" | "string" | "json"). */
export interface ServiceConfigEntry {
  id: string;
  tenant_id?: string;
  config_key: string;
  config_value: string;
  config_type: string;
  description: string;
  is_secret: boolean;
  is_override: boolean;
  created_at: string;
  updated_at: string;
}

/** Flattened, typed view of the tenant's real ServiceConfig rows (seeded in
 * cmd/seed/main.go's seedServiceConfigs — these are the only keys that exist). Keys here
 * are the config_key with the "logistics." prefix stripped. There is no tenant-level SLA
 * window, pricing, or notification-trigger config on the backend; pricing rules are a
 * separate real entity managed from the Earnings page, not ServiceConfig. */
/** Tenant settings the API acts on (keys without the "logistics." prefix). */
export interface ServiceConfigMap {
  pod_required?: boolean;
  auto_assign_enabled?: boolean;
}

/** RBAC types */
/** A role with its permission codes and how many users hold it (GET /rbac/roles). */
export interface LogisticsRole {
  id: string;
  role_code: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  permissions: string[];
  assignment_count: number;
}

export interface LogisticsPermission {
  id: string;
  permission_code: string;
  name: string;
  module: string;
  action: string;
}

/** A role held by a user (GET /rbac/assignments). */
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role_id: string;
  role_code: string;
  role_name: string;
  assigned_at: string;
  expires_at?: string;
}

/** Auth/me response (Trinity Layer 3) */
export interface ServiceAuthMe {
  id: string;
  email: string;
  global_roles: string[];
  service_role: {
    id: string;
    code: string;
    name: string;
  } | null;
  permissions: string[];
  tenant_id: string;
  tenant_slug: string;
  is_platform_owner: boolean;
  use_case: string;
  /** Null/undefined means all modules (platform owner). Non-null array is the explicit allowlist. */
  enabled_modules: string[] | null;
}

/** Pagination — matches github.com/Bengo-Hub/pagination's Response[T] envelope, which every
 * list handler in logistics-api uses (pagination.NewResponse). The field is "hasMore"
 * (camelCase), not "has_more" — this package is the odd one out fleet-wide. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── Distribution / KEMSA ─────────────────────────────────────────────────────

export type ShipmentStatus = "planned" | "in_transit" | "partially_delivered" | "completed" | "cancelled";
export type ShipmentType = "warehouse_transfer" | "hospital_delivery" | "recall";
export type CustodyEventType = "released" | "received" | "sealed" | "unsealed" | "temperature_breach" | "damaged" | "partial";

export interface Shipment {
  id: string;
  tenant_id: string;
  shipment_code: string;
  shipment_type: ShipmentType;
  status: ShipmentStatus;
  fleet_type: string;
  source_facility_id?: string | null;
  source_facility_name?: string;
  dest_facility_id?: string | null;
  dest_facility_name?: string;
  temperature_min_celsius?: number | null;
  temperature_max_celsius?: number | null;
  special_handling?: string[];
  seal_number?: string;
  planned_dispatch_at?: string | null;
  dispatched_at?: string | null;
  completed_at?: string | null;
  external_reference?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: {
    chain_of_custody?: ChainOfCustody[];
  };
}

export interface ChainOfCustody {
  id: string;
  shipment_id: string;
  task_id?: string | null;
  actor_id: string;
  actor_name: string;
  event_type: CustodyEventType;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  photo_url?: string;
  signature_url?: string;
  temperature_reading?: number | null;
  received_quantity?: number | null;
  receiving_staff_name?: string;
  occurred_at: string;
}

export interface CreateShipmentRequest {
  shipment_type?: ShipmentType;
  source_facility_id?: string;
  source_facility_name: string;
  dest_facility_id?: string;
  dest_facility_name: string;
  temperature_min_celsius?: number;
  temperature_max_celsius?: number;
  special_handling?: string[];
  seal_number?: string;
  planned_dispatch_at?: string;
  external_reference?: string;
}

export interface AddCustodyEventRequest {
  actor_name: string;
  event_type: CustodyEventType;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  photo_url?: string;
  signature_url?: string;
  temperature_reading?: number;
  received_quantity?: number;
  receiving_staff_name?: string;
  task_id?: string;
}

/** Rider Shifts */
export type ShiftStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface RiderShift {
  id: string;
  tenant_id: string;
  fleet_member_id: string;
  shift_start: string;
  shift_end: string;
  status: ShiftStatus;
  zone_ids?: string[];
  created_at: string;
  updated_at: string;
  edges?: {
    fleet_member?: FleetMember;
  };
}

export interface CreateShiftRequest {
  fleet_member_id: string;
  shift_start: string;
  shift_end: string;
  zone_ids?: string[];
}

/** Routing */
export interface RouteResult {
  distance_meters: number;
  duration_seconds: number;
  geometry: unknown;
  waypoints: Array<{ lat: number; lng: number; name?: string }>;
}

export interface ETAResult {
  eta_seconds: number;
  distance_meters: number;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

/** Dispatcher operational alert (tasks needing manual attention, SLA breaches). Tenant-wide,
 * not per-user — matches logistics-api's LogisticsNotification entity. */
export interface LogisticsNotification {
  id: string;
  tenant_id: string;
  notification_type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  related_task_id: string | null;
  is_read: boolean;
  created_at: string;
}
