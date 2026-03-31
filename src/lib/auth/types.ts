export type UserRole = "staff" | "admin" | "superuser";

export type Permission =
  // Tasks
  | "logistics.tasks.add"
  | "logistics.tasks.view"
  | "logistics.tasks.view_own"
  | "logistics.tasks.change"
  | "logistics.tasks.change_own"
  | "logistics.tasks.delete"
  | "logistics.tasks.delete_own"
  | "logistics.tasks.manage"
  | "logistics.tasks.manage_own"
  // Fleet (riders)
  | "logistics.fleet.add"
  | "logistics.fleet.view"
  | "logistics.fleet.view_own"
  | "logistics.fleet.change"
  | "logistics.fleet.change_own"
  | "logistics.fleet.delete"
  | "logistics.fleet.delete_own"
  | "logistics.fleet.manage"
  | "logistics.fleet.manage_own"
  // Zones
  | "logistics.zones.add"
  | "logistics.zones.view"
  | "logistics.zones.view_own"
  | "logistics.zones.change"
  | "logistics.zones.change_own"
  | "logistics.zones.delete"
  | "logistics.zones.delete_own"
  | "logistics.zones.manage"
  | "logistics.zones.manage_own"
  // Telemetry (tracking)
  | "logistics.telemetry.add"
  | "logistics.telemetry.view"
  | "logistics.telemetry.view_own"
  | "logistics.telemetry.change"
  | "logistics.telemetry.change_own"
  | "logistics.telemetry.delete"
  | "logistics.telemetry.delete_own"
  | "logistics.telemetry.manage"
  | "logistics.telemetry.manage_own"
  // Routing
  | "logistics.routing.add"
  | "logistics.routing.view"
  | "logistics.routing.view_own"
  | "logistics.routing.change"
  | "logistics.routing.change_own"
  | "logistics.routing.delete"
  | "logistics.routing.delete_own"
  | "logistics.routing.manage"
  | "logistics.routing.manage_own"
  // Vehicles
  | "logistics.vehicles.add"
  | "logistics.vehicles.view"
  | "logistics.vehicles.view_own"
  | "logistics.vehicles.change"
  | "logistics.vehicles.change_own"
  | "logistics.vehicles.delete"
  | "logistics.vehicles.delete_own"
  | "logistics.vehicles.manage"
  | "logistics.vehicles.manage_own"
  // Geofences
  | "logistics.geofences.add"
  | "logistics.geofences.view"
  | "logistics.geofences.view_own"
  | "logistics.geofences.change"
  | "logistics.geofences.change_own"
  | "logistics.geofences.delete"
  | "logistics.geofences.delete_own"
  | "logistics.geofences.manage"
  | "logistics.geofences.manage_own"
  // Carriers
  | "logistics.carriers.add"
  | "logistics.carriers.view"
  | "logistics.carriers.view_own"
  | "logistics.carriers.change"
  | "logistics.carriers.change_own"
  | "logistics.carriers.delete"
  | "logistics.carriers.delete_own"
  | "logistics.carriers.manage"
  | "logistics.carriers.manage_own"
  // Earnings
  | "logistics.earnings.add"
  | "logistics.earnings.view"
  | "logistics.earnings.view_own"
  | "logistics.earnings.change"
  | "logistics.earnings.change_own"
  | "logistics.earnings.delete"
  | "logistics.earnings.delete_own"
  | "logistics.earnings.manage"
  | "logistics.earnings.manage_own"
  // Config
  | "logistics.config.add"
  | "logistics.config.view"
  | "logistics.config.view_own"
  | "logistics.config.change"
  | "logistics.config.change_own"
  | "logistics.config.delete"
  | "logistics.config.delete_own"
  | "logistics.config.manage"
  | "logistics.config.manage_own"
  // Users
  | "logistics.users.add"
  | "logistics.users.view"
  | "logistics.users.view_own"
  | "logistics.users.change"
  | "logistics.users.change_own"
  | "logistics.users.delete"
  | "logistics.users.delete_own"
  | "logistics.users.manage"
  | "logistics.users.manage_own";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  sessionId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  roles: UserRole[];
  permissions: Permission[];
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner?: boolean;
  isSuperUser?: boolean;
}

export interface AuthResponse {
  session: SessionTokens;
  user: UserProfile;
}
