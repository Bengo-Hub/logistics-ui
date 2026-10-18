"use client";

import { Input } from "@/components/ui/base";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";
import type { CreateVehicleRequest, InsuranceInput, VehicleType } from "@/types/logistics";
import { cleanInsurance, EMPTY_INSURANCE, InsuranceFields, insuranceMissing } from "./insurance-fields";

/** The vehicle form state: the vehicle plus, for a motorised vehicle, its insurance. */
export interface VehicleDraft {
  vehicle_type: VehicleType;
  license_plate: string;
  make: string;
  model: string;
  chassis_no: string;
  with_insurance: boolean;
  insurance: InsuranceInput;
}

export const EMPTY_VEHICLE: VehicleDraft = {
  vehicle_type: "motorcycle",
  license_plate: "",
  make: "",
  model: "",
  chassis_no: "",
  with_insurance: true,
  insurance: EMPTY_INSURANCE,
};

/** Bicycles never need insurance; everything else does. */
export const needsInsurance = (t: VehicleType) => t !== "bicycle";

/** Missing required field, or "" when the draft can be saved. */
export function vehicleMissing(d: VehicleDraft): string {
  if (!d.license_plate.trim()) return "number plate";
  if (needsInsurance(d.vehicle_type) && d.with_insurance) return insuranceMissing(d.insurance);
  return "";
}

/** The API body for a draft (insurance only when recorded now). */
export function vehicleRequest(d: VehicleDraft, memberId?: string): CreateVehicleRequest {
  const body: CreateVehicleRequest = {
    vehicle_type: d.vehicle_type,
    license_plate: d.license_plate.trim(),
    make: d.make.trim() || undefined,
    model: d.model.trim() || undefined,
    chassis_no: d.chassis_no.trim() || undefined,
  };
  if (needsInsurance(d.vehicle_type) && d.with_insurance) body.insurance = cleanInsurance(d.insurance);
  if (memberId) body.member_id = memberId;
  return body;
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The one vehicle form: Vehicles page, a rider's sheet and the add-rider dialog all use it. */
export function VehicleForm({ value, onChange }: { value: VehicleDraft; onChange: (d: VehicleDraft) => void }) {
  const set = <K extends keyof VehicleDraft>(k: K, v: VehicleDraft[K]) => onChange({ ...value, [k]: v });
  const insurable = needsInsurance(value.vehicle_type);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Number plate *">
          <Input value={value.license_plate} onChange={(e) => set("license_plate", e.target.value)} placeholder="KMGX 040M" />
        </Field>
        <Field label="Type *">
          <select className={SELECT_CLASS} value={value.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value as VehicleType)}>
            {VEHICLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Make">
          <Input value={value.make} onChange={(e) => set("make", e.target.value)} placeholder="Honda" />
        </Field>
        <Field label="Model">
          <Input value={value.model} onChange={(e) => set("model", e.target.value)} placeholder="CB125F" />
        </Field>
        <Field label="Chassis number">
          <Input value={value.chassis_no} onChange={(e) => set("chassis_no", e.target.value)} placeholder="As on the insurance certificate" />
        </Field>
      </div>
      {insurable && (
        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={value.with_insurance} onChange={(e) => set("with_insurance", e.target.checked)} />
            Record the insurance now
          </label>
          {value.with_insurance ? (
            <InsuranceFields value={value.insurance} onChange={(v) => set("insurance", v)} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Unless your settings allow it, a motorised vehicle with no insurance recorded gets no jobs until it is added.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
