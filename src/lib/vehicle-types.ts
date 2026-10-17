import type { VehicleType } from "@/types/logistics";

/** The vehicle types the API stores (fleet.NormalizeVehicleType), shared by every vehicle form. */
export const VEHICLE_TYPES: Array<{ value: VehicleType; label: string }> = [
  { value: "motorcycle", label: "Motorcycle" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
  { value: "other", label: "Other" },
];
