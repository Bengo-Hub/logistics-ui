"use client";

// Re-export all domain hooks for backward compatibility.
// New code should import directly from the domain-specific hook files.

export {
  useFleet,
  useFleetMembers,
  useFleetMember,
  useInviteMember,
  useApproveMember,
  useSuspendMember,
  useRejectMember,
  useDeleteMember,
  useBatchInviteMembers,
  useCreateVehicle,
  useAssignVehicle,
} from "@/hooks/use-fleet";

export {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTaskStatus,
  useAssignTask,
  useDispatchTask,
  useSubmitPoD,
  useRateRider,
} from "@/hooks/use-tasks";

export {
  useZones,
  useZone,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
} from "@/hooks/use-zones";

export { useTelemetry } from "@/hooks/use-telemetry";

// Legacy types kept for backward compatibility
export type { MembersParams as FleetMembersParams } from "@/lib/api/logistics";
export type { PaginatedResponse as PaginatedFleetMembers } from "@/types/logistics";
export type { GeoFence } from "@/types/logistics";

// Public tracking hook (not yet in a domain file)
export { usePublicTracking } from "@/hooks/use-tracking";
