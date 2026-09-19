"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Layers,
  Link2,
  Loader2,
  MapPin,
  Save,
  Settings,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { useServiceConfig, useUpdateServiceConfig } from "@/hooks/use-service-config";
import { useModuleAccess, useModulesConfig, useUpdateModules } from "@/hooks/use-module-access";
import type { ServiceConfigMap } from "@/types/logistics";

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL ?? "https://sso.codevertexafrica.com";
const LOGISTICS_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://logisticsapi.codevertexafrica.com";

// ─── Nav Tabs ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "general", label: "General", icon: Settings },
  { id: "assignment", label: "Assignment", icon: Zap },
  { id: "tracking", label: "Tracking", icon: MapPin },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "modules", label: "Modules", icon: Layers },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30">
      <span className="text-sm font-medium">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? "";

  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const { data: config, isLoading } = useServiceConfig();
  const { mutateAsync: saveConfig, isPending } = useUpdateServiceConfig();

  const [form, setForm] = useState<Partial<ServiceConfigMap>>({});

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  function set<K extends keyof ServiceConfigMap>(key: K, value: ServiceConfigMap[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    try {
      await saveConfig(form);
      toast.success("Settings saved successfully.");
    } catch {
      toast.error("Failed to save settings. Please try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure logistics operations, dispatch rules, SLA thresholds, and integrations.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-border pb-0">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {activeSection === "general" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Delivery Options</CardTitle>
              <CardDescription>Proof of delivery requirement and default task timeout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle
                checked={form.pod_required ?? false}
                onChange={(v) => set("pod_required", v)}
                label="Require Proof of Delivery (PoD)"
              />
              <FieldRow
                label="Default Task Timeout (seconds)"
                hint="How long a task can sit unassigned before it's flagged."
              >
                <Input
                  type="number"
                  min={60}
                  value={form.default_task_timeout ?? ""}
                  onChange={(e) => set("default_task_timeout", Number(e.target.value))}
                />
              </FieldRow>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Assignment ── */}
      {activeSection === "assignment" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="size-4 text-primary" />
                Auto-Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle
                checked={form.auto_assign_enabled ?? false}
                onChange={(v) => set("auto_assign_enabled", v)}
                label="Enable Automatic Task Dispatch"
              />
              <FieldRow label="Max Concurrent Tasks per Rider">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={form.max_concurrent_tasks ?? ""}
                  onChange={(e) => set("max_concurrent_tasks", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Max Fleet Size" hint="Maximum fleet members allowed for this tenant.">
                <Input
                  type="number"
                  min={1}
                  value={form.max_fleet_size ?? ""}
                  onChange={(e) => set("max_fleet_size", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow
                label="Geofence Radius (meters)"
                hint="Proximity radius used to detect pickup/dropoff arrival."
              >
                <Input
                  type="number"
                  min={10}
                  value={form.geofence_radius_meters ?? ""}
                  onChange={(e) => set("geofence_radius_meters", Number(e.target.value))}
                />
              </FieldRow>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tracking ── */}
      {activeSection === "tracking" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-primary" />
                Live Tracking &amp; Routing
              </CardTitle>
              <CardDescription>
                Telemetry reporting cadence and public tracking link expiry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldRow
                label="Telemetry Interval (seconds)"
                hint="How often a rider's app reports its location."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.telemetry_interval_seconds ?? ""}
                  onChange={(e) => set("telemetry_interval_seconds", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow
                label="Public Tracking Link Expiry (hours)"
                hint="How long a customer's tracking link stays valid after creation."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.tracking_link_expiry_hours ?? ""}
                  onChange={(e) => set("tracking_link_expiry_hours", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Max Route Waypoints" hint="Upper bound on stops per routing request.">
                <Input
                  type="number"
                  min={2}
                  value={form.max_route_waypoints ?? ""}
                  onChange={(e) => set("max_route_waypoints", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow
                label="Earnings Payout Cycle (days)"
                hint="How often rider earnings statements are settled."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.earnings_payout_cycle_days ?? ""}
                  onChange={(e) => set("earnings_payout_cycle_days", Number(e.target.value))}
                />
              </FieldRow>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Pricing Rules</CardTitle>
              <CardDescription>
                Base fees, per-km rates and surge rules are managed from the Earnings page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href={`/${orgSlug}/earnings?tab=pricing`}>Open Pricing Rules</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Integrations ── */}
      {activeSection === "integrations" && (
        <IntegrationsSection />
      )}

      {/* ── Modules ── */}
      {activeSection === "modules" && (
        <ModulesSection />
      )}

      {/* Save bar (not shown on Integrations or Modules tabs — they have their own saves) */}
      {activeSection !== "integrations" && activeSection !== "modules" && (
        <div className="flex items-center justify-between border-t border-border pt-4 max-w-2xl">
          <p className="text-xs text-muted-foreground">
            Changes apply immediately after saving.
          </p>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Modules Section ─────────────────────────────────────────────────────────

const ALL_MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  fleet: "Fleet Management",
  dispatch: "Dispatch",
  tracking: "Live Tracking",
  analytics: "Analytics",
  earnings: "Earnings & Payouts",
  vehicles: "Vehicles",
  pricing: "Pricing",
  distribution: "Distribution (KEMSA)",
  cold_chain: "Cold Chain Monitoring",
  smart_locks: "Smart Locks",
  rbac: "Roles & Permissions",
  settings: "Settings",
  reporting: "Reporting",
  shifts: "Shift Scheduling",
};

function ModulesSection() {
  const { isPlatformOwner, enabledModules } = useModuleAccess();
  const { data: modulesConfig, isLoading } = useModulesConfig();
  const { mutateAsync: saveModules, isPending } = useUpdateModules();
  const [selected, setSelected] = useState<string[]>([]);

  // Init selected from config once loaded
  const configModules = modulesConfig?.enabled_modules ?? enabledModules;
  const allModules = modulesConfig?.all_modules ?? Object.keys(ALL_MODULE_LABELS);

  // Sync local state with fetched config
  useState(() => {
    if (configModules.length > 0 && selected.length === 0) {
      setSelected(configModules);
    }
  });

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    try {
      await saveModules(selected);
      toast.success("Module configuration saved.");
    } catch {
      toast.error("Failed to save module configuration.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-primary" />
            Enabled Modules
          </CardTitle>
          <CardDescription>
            {isPlatformOwner
              ? "Configure which modules are available for this tenant. Platform owners always see all modules."
              : "Modules enabled for your tenant. Contact your platform admin to change this."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {allModules.map((key) => {
            const label = ALL_MODULE_LABELS[key] ?? key;
            const checked = isPlatformOwner
              ? (selected.length === 0 ? true : selected.includes(key))
              : enabledModules.includes(key);
            return (
              <label
                key={key}
                className={`flex items-center justify-between rounded-lg border border-border p-3 ${
                  isPlatformOwner ? "cursor-pointer hover:bg-muted/30" : "opacity-70"
                }`}
              >
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-muted-foreground font-mono">{key}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={checked}
                  type="button"
                  disabled={!isPlatformOwner}
                  onClick={() => isPlatformOwner && toggle(key)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    checked ? "bg-primary" : "bg-border"
                  } ${isPlatformOwner ? "" : "cursor-not-allowed"}`}
                >
                  <span
                    className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                      checked ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </CardContent>
      </Card>

      {isPlatformOwner && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Changes take effect on the tenant&apos;s next /auth/me call.
          </p>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isPending ? "Saving…" : "Save Modules"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Integrations Section ─────────────────────────────────────────────────────

function IntegrationsSection() {
  const [authApiUrl, setAuthApiUrl] = useState(AUTH_API_URL);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  const testConnection = async () => {
    setTestStatus("loading");
    try {
      const res = await fetch(`${authApiUrl}/healthz`);
      setTestStatus(res.ok ? "ok" : "fail");
    } catch {
      setTestStatus("fail");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4 text-primary" />
            S2S Auth
          </CardTitle>
          <CardDescription>Auth-API endpoint used for service-to-service token validation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Auth-API URL">
            <div className="flex gap-2">
              <Input
                value={authApiUrl}
                onChange={(e) => setAuthApiUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="button" onClick={testConnection} disabled={testStatus === "loading"}>
                {testStatus === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Test"
                )}
              </Button>
            </div>
            {testStatus === "ok" && (
              <p className="text-xs text-success mt-1">Connection successful</p>
            )}
            {testStatus === "fail" && (
              <p className="text-xs text-destructive mt-1">Connection failed</p>
            )}
          </FieldRow>
          <FieldRow label="Logistics API URL (read-only)">
            <Input value={LOGISTICS_API_URL} readOnly className="opacity-60 cursor-not-allowed" />
          </FieldRow>
        </CardContent>
      </Card>
    </div>
  );
}
