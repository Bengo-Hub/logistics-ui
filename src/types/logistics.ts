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
  id_passport_number: string;
  id_passport_attachment: string;
  rider_photo: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: {
    fleet?: Fleet;
    vehicles?: Vehicle[];
  };
}

export type FleetMemberStatus = "pending" | "active" | "suspended" | "rejected";

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
  fleet_id: string;
  fleet_member_id?: string;
  registration_number: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  capacity_kg: number;
  status: string;
  license_plate_image: string;
  front_view_image: string;
  side_view_image: string;
  created_at: string;
  updated_at: string;
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
}

/** Proof of delivery */
export interface ProofOfDelivery {
  id: string;
  task_id: string;
  fleet_member_id: string;
  signature_url: string;
  photo_url: string;
  otp_code: string;
  metadata: Record<string, unknown>;
  created_at: string;
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
