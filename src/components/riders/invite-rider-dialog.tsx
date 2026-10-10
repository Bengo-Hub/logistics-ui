"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useInviteMember } from "@/hooks/use-fleet";
import type { EmploymentType } from "@/lib/api/logistics";

// The one rider onboarding form. The riders page opens it, and other apps (the storefront's
// staff area) link to /{org}/riders?invite=1 instead of keeping a copy.

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  id_number: "",
  license_no: "",
  employment: "freelance" as EmploymentType,
};

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string; hint: string }> = [
  {
    value: "freelance",
    label: "Freelance rider",
    hint: "Paid per delivery from the rider pricing rules.",
  },
  {
    value: "staff",
    label: "Staff (on payroll)",
    hint: "Salaried in HR payroll. No per-delivery pay; per diem for long trips is claimed in HR.",
  },
];

export function InviteRiderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const invite = useInviteMember();
  const set = (key: keyof typeof EMPTY, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const submit = () => {
    const { employment, ...rest } = form;
    invite.mutate(
      { ...rest, employment: { type: employment } },
      {
        onSuccess: () => {
          setForm(EMPTY);
          onOpenChange(false);
          toast.success("Rider invited. They get an email to finish sign-up.");
        },
        onError: (err: any) => toast.error(err?.response?.data || "Failed to invite rider"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add rider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Jane" />
            </Field>
            <Field label="Last name">
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Doe" />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254 700 000 000" />
            </Field>
            <Field label="National ID">
              <Input value={form.id_number} onChange={(e) => set("id_number", e.target.value)} />
            </Field>
            <Field label="Driving licence no.">
              <Input value={form.license_no} onChange={(e) => set("license_no", e.target.value)} />
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Engagement</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EMPLOYMENT_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                    form.employment === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="employment"
                    value={o.value}
                    checked={form.employment === o.value}
                    onChange={() => set("employment", o.value)}
                    className="sr-only"
                  />
                  <span className="font-medium">{o.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{o.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.email || invite.isPending}>
            {invite.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
