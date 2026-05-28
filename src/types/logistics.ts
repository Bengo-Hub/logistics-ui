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
  edges?: {
    fleet?: Fleet;
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

/** Delivery task from logistics-api */
export interface Task {
  id: string;
  tenant_id: string;
  tracking_code: string;
  external_reference: string;
  source_service: string;
  task_type: string;
  priority: number;
  status: TaskStatus;
  sla_due_at: string | null;
  requested_pickup_at: string | null;
  requested_dropoff_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: {
    steps?: TaskStep[];
    events?: TaskEvent[];
    assignments?: TaskAssignment[];
    proof_of_delivery?: ProofOfDelivery;
  };
}

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

/** Geo-fence zone */
export interface GeoFence {
  id: string;
  tenant_id: string;
  name: string;
  zone_type: string;
  status: string;
  boundary: number[][];
  color: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export interface ServiceConfigMap {
  [key: string]: unknown;
  auto_dispatch_enabled?: boolean;
  sla_hours?: number;
  max_riders_per_zone?: number;
  pod_required?: boolean;
  rating_required?: boolean;
  base_delivery_fee?: string;
  per_km_rate?: string;
  currency?: string;
  notify_on_dispatch?: boolean;
  notify_on_delivery?: boolean;
}

/** RBAC types */
export interface LogisticsRole {
  id: string;
  tenant_id: string;
  role_code: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  edges?: {
    permissions?: LogisticsPermission[];
    user_assignments?: UserRoleAssignment[];
  };
}

export interface LogisticsPermission {
  id: string;
  permission_code: string;
  name: string;
  description: string;
  module: string;
  created_at: string;
}

export interface UserRoleAssignment {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  created_at: string;
  edges?: {
    role?: LogisticsRole;
    user?: FleetMember;
  };
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

/** Pagination */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
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
