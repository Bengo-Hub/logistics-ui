"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui/base";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useFleetVehicles,
  useInviteMember,
  useOnboardRider,
} from "@/hooks/use-fleet";
import {
  PAY_BASIS_LABEL,
  type EmploymentType,
  type OnboardRiderBody,
  type OnboardRiderResult,
  type PayBasis,
} from "@/lib/api/logistics";
import { apiErrorText } from "@/lib/utils";
import {
  EMPTY_VEHICLE,
  VehicleForm,
  vehicleMissing,
  vehicleRequest,
  type VehicleDraft,
} from "@/components/vehicles/vehicle-form";

// The one rider onboarding form. The riders page opens it, and other apps (the storefront's
// staff area) link to /{org}/riders?invite=1 instead of keeping a copy.
//
// Freelance riders are invited by email and complete their own KYC. Internal (staff) riders are
// filled in here by the admin and are active at once: the ID number is the one identity detail
// required, ID and photo uploads are optional, and the admin chooses whether to also email them
// the sign-in link.

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  id_number: "",
  license_no: "",
};

type VehicleChoice = "none" | "existing" | "new";

const EMPLOYMENT_OPTIONS: Array<{
  value: EmploymentType;
  label: string;
  hint: string;
}> = [
  {
    value: "staff",
    label: "Internal rider",
    hint: "Your own employee. Add every detail here and they are active straight away.",
  },
  {
    value: "freelance",
    label: "Freelance rider",
    hint: "External rider. They get an email, upload their documents and wait for your approval.",
  },
];

const PAY_OPTIONS: Array<{ value: PayBasis; hint: string }> = [
  {
    value: "payroll",
    hint: "Paid a salary in HR payroll. No per-delivery earnings; per diem for long trips is claimed in HR.",
  },
  {
    value: "earning_rules",
    hint: "Paid per delivery from the rider pricing rules, like a freelance rider.",
  },
];

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InviteRiderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [employment, setEmployment] = useState<EmploymentType>("staff");
  const [payBasis, setPayBasis] = useState<PayBasis>("payroll");
  const [vehicleChoice, setVehicleChoice] = useState<VehicleChoice>("none");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const [sendInvite, setSendInvite] = useState(true);
  // The sign-in details of the rider just added, shown once (the password is never stored).
  const [created, setCreated] = useState<OnboardRiderResult | null>(null);

  const invite = useInviteMember();
  const onboard = useOnboardRider();
  const internal = employment === "staff";
  const pending = invite.isPending || onboard.isPending;

  // Only vehicles no rider has yet can be linked, so the list is never stale-but-selectable.
  const { data: freeVehicles } = useFleetVehicles(
    { assigned: false, limit: 100 },
    open && internal,
  );
  const free = freeVehicles?.data ?? [];

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const reset = () => {
    setForm(EMPTY);
    setEmployment("staff");
    setPayBasis("payroll");
    setVehicleChoice("none");
    setVehicleId("");
    setVehicle(EMPTY_VEHICLE);
    setSendInvite(true);
    setCreated(null);
  };
  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };
  const done = (message: string) => {
    reset();
    onOpenChange(false);
    toast.success(message);
  };

  // What is still missing, shown on the button's disabled state.
  const missing = (() => {
    if (!form.email.trim()) return "email";
    if (!internal) return "";
    if (!form.first_name.trim()) return "first name";
    if (!form.phone.trim()) return "phone";
    if (!form.id_number.trim()) return "ID number";
    if (vehicleChoice === "existing" && !vehicleId) return "vehicle";
    if (vehicleChoice === "new") return vehicleMissing(vehicle);
    return "";
  })();

  const submit = () => {
    if (!internal) {
      invite.mutate(
        { ...form, employment: { type: "freelance" } },
        {
          onSuccess: () =>
            done("Rider invited. They get an email to finish sign-up."),
          onError: (err) =>
            toast.error(apiErrorText(err, "Failed to invite rider")),
        },
      );
      return;
    }
    const body: OnboardRiderBody = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || undefined,
      email: form.email.trim(),
      phone: form.phone.trim(),
      id_number: form.id_number.trim(),
      license_no: form.license_no.trim() || undefined,
      pay_basis: payBasis,
      send_invite: sendInvite,
    };
    if (vehicleChoice === "existing") body.vehicle_id = vehicleId;
    if (vehicleChoice === "new") body.vehicle = vehicleRequest(vehicle);
    onboard.mutate(body, {
      onSuccess: (res) => {
        if (sendInvite && !res.email_sent)
          toast.error(
            "Rider added, but the email could not be sent. Hand over the details below.",
          );
        // A new account has a one-time password the admin may need to hand over: show it.
        if (res.temp_password) {
          setCreated(res);
          return;
        }
        done(
          res.existing_account
            ? `Rider added. They sign in with their existing account${res.email_sent ? "; we emailed them" : ""}.`
            : "Rider added.",
        );
      },
      onError: (err) =>
        toast.error(apiErrorText(err, "Could not add the rider")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {created ? (
          <CreatedRider result={created} onDone={() => close(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Engagement</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {EMPLOYMENT_OPTIONS.map((o) => (
                    <RadioCard
                      key={o.value}
                      name="employment"
                      checked={employment === o.value}
                      onSelect={() => setEmployment(o.value)}
                      label={o.label}
                      hint={o.hint}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={internal ? "First name *" : "First name"}>
                  <Input
                    value={form.first_name}
                    onChange={(e) => set("first_name", e.target.value)}
                    placeholder="Jane"
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={form.last_name}
                    onChange={(e) => set("last_name", e.target.value)}
                    placeholder="Doe"
                  />
                </Field>
                <Field label="Email *">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="jane@example.com"
                  />
                </Field>
                <Field label={internal ? "Phone *" : "Phone"}>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+254 700 000 000"
                  />
                </Field>
                <Field
                  label={
                    internal ? "National ID or passport no. *" : "National ID"
                  }
                >
                  <Input
                    value={form.id_number}
                    onChange={(e) => set("id_number", e.target.value)}
                  />
                </Field>
                <Field label="Driving licence no.">
                  <Input
                    value={form.license_no}
                    onChange={(e) => set("license_no", e.target.value)}
                  />
                </Field>
              </div>

              {internal && (
                <>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      How are they paid?
                    </legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {PAY_OPTIONS.map((o) => (
                        <RadioCard
                          key={o.value}
                          name="pay_basis"
                          checked={payBasis === o.value}
                          onSelect={() => setPayBasis(o.value)}
                          label={PAY_BASIS_LABEL[o.value]}
                          hint={o.hint}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      Vehicle or motorbike
                    </legend>
                    <select
                      className={SELECT_CLASS}
                      value={vehicleChoice}
                      onChange={(e) =>
                        setVehicleChoice(e.target.value as VehicleChoice)
                      }
                    >
                      <option value="none">No vehicle yet</option>
                      <option value="existing">
                        Link a vehicle from the fleet
                      </option>
                      <option value="new">Register a new vehicle</option>
                    </select>
                    {vehicleChoice === "existing" && (
                      <>
                        <select
                          className={SELECT_CLASS}
                          value={vehicleId}
                          onChange={(e) => setVehicleId(e.target.value)}
                        >
                          <option value="">Select a free vehicle...</option>
                          {free.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.license_plate} (
                              {[v.make, v.model]
                                .filter((p) => p && p !== "Unknown")
                                .join(" ") || v.vehicle_type}
                              )
                            </option>
                          ))}
                        </select>
                        {free.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Every vehicle already has a rider. Register a new
                            one instead.
                          </p>
                        )}
                      </>
                    )}
                    {vehicleChoice === "new" && (
                      <VehicleForm value={vehicle} onChange={setVehicle} />
                    )}
                  </fieldset>

                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={sendInvite}
                      onChange={(e) => setSendInvite(e.target.checked)}
                    />
                    <span>
                      Email them their sign-in details
                      <span className="block text-xs text-muted-foreground">
                        A new account gets a temporary password, sent in this
                        email and shown to you once. They must change it the
                        first time they sign in. ID and photo uploads are
                        optional for internal riders.
                      </span>
                    </span>
                  </label>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={!!missing || pending}
                title={missing ? `Add the ${missing}` : undefined}
              >
                {pending ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : null}
                {internal ? "Add rider" : "Send invite"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The new rider's sign-in details, shown once. The password exists nowhere else in logistics. */
function CreatedRider({
  result,
  onDone,
}: {
  result: OnboardRiderResult;
  onDone: () => void;
}) {
  const copy = (text: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Could not copy; select and copy it instead"));
  return (
    <>
      <DialogHeader>
        <DialogTitle>Rider added</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <p>
          {result.email_sent
            ? "We emailed these sign-in details to the rider."
            : "Hand these sign-in details to the rider. They were not emailed."}{" "}
          This is the only time the password is shown. They must change it the
          first time they sign in.
        </p>
        <div className="space-y-2 rounded-lg border border-border p-3">
          <CopyRow label="Email" value={result.email} onCopy={copy} />
          <CopyRow
            label="Temporary password"
            value={result.temp_password ?? ""}
            onCopy={copy}
            mono
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`truncate font-medium ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onCopy(value)}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

function RadioCard({
  name,
  checked,
  onSelect,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
        checked
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="font-medium">{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
