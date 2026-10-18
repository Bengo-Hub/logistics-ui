"use client";

import { Input } from "@/components/ui/base";
import { FileUpload } from "@/components/ui/file-upload";
import type { InsuranceInput } from "@/types/logistics";

export const EMPTY_INSURANCE: InsuranceInput = {
  policy_no: "",
  certificate_no: "",
  insurer: "",
  cover: "",
  starts_on: "",
  expires_on: "",
  document: "",
};

/** Missing required field of a policy, or "" when it can be saved. */
export function insuranceMissing(v: InsuranceInput): string {
  if (!v.policy_no.trim()) return "policy number";
  if (!v.expires_on) return "expiry date";
  return "";
}

/** Trims a policy for the API, dropping blank optional fields. */
export function cleanInsurance(v: InsuranceInput): InsuranceInput {
  const out: InsuranceInput = { policy_no: v.policy_no.trim(), expires_on: v.expires_on };
  for (const k of ["certificate_no", "insurer", "cover", "starts_on", "document"] as const) {
    const val = v[k]?.trim();
    if (val) out[k] = val;
  }
  return out;
}

/** The policy as printed on the certificate. Policy number and expiry are required. */
export function InsuranceFields({ value, onChange }: { value: InsuranceInput; onChange: (v: InsuranceInput) => void }) {
  const set = (k: keyof InsuranceInput, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Policy number *">
        <Input value={value.policy_no} onChange={(e) => set("policy_no", e.target.value)} placeholder="030/071/1/000255/2026/03" />
      </Field>
      <Field label="Certificate number">
        <Input value={value.certificate_no ?? ""} onChange={(e) => set("certificate_no", e.target.value)} placeholder="D5337693" />
      </Field>
      <Field label="Insurer">
        <Input value={value.insurer ?? ""} onChange={(e) => set("insurer", e.target.value)} placeholder="Old Mutual General Insurance" />
      </Field>
      <Field label="Cover">
        <Input value={value.cover ?? ""} onChange={(e) => set("cover", e.target.value)} placeholder="COMP or TPO" />
      </Field>
      <Field label="Starts on">
        <Input type="date" value={value.starts_on ?? ""} onChange={(e) => set("starts_on", e.target.value)} />
      </Field>
      <Field label="Expires on *">
        <Input type="date" value={value.expires_on} onChange={(e) => set("expires_on", e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <FileUpload label="Certificate" value={value.document} onChange={(ref) => set("document", ref)} />
      </div>
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
