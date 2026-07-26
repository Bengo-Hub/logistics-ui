"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bell,
  Globe,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Package,
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
  { id: "sla", label: "SLA", icon: MapPin },
  { id: "pricing", label: "Pricing", icon: Package },
  { id: "notifications", label: "Notifications", icon: Bell },
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
              <CardDescription>Configure proof of delivery and rating requirements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Toggle
                checked={form.pod_required ?? false}
                onChange={(v) => set("pod_required", v)}
                label="Require Proof of Delivery (PoD)"
              />
              <Toggle
                checked={form.rating_required ?? false}
                onChange={(v) => set("rating_required", v)}
                label="Require Rider Rating after Delivery"
              />
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
                checked={form.auto_dispatch_enabled ?? false}
                onChange={(v) => set("auto_dispatch_enabled", v)}
                label="Enable Automatic Task Dispatch"
              />
              <FieldRow label="Max Riders per Zone">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={form.max_riders_per_zone ?? ""}
                  onChange={(e) => set("max_riders_per_zone", Number(e.target.value))}
                />
              </FieldRow>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SLA ── */}
      {activeSection === "sla" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-primary" />
                SLA Configuration
              </CardTitle>
              <CardDescription>
                Service level agreement thresholds for delivery operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldRow
                label="SLA Window (hours)"
                hint="Total hours from task creation to required delivery."
              >
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={form.sla_hours ?? ""}
                  onChange={(e) => set("sla_hours", Number(e.target.value))}
                />
              </FieldRow>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Pricing ── */}
      {activeSection === "pricing" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-primary" />
                Delivery Pricing
              </CardTitle>
              <CardDescription>
                Configure base fee and per-km rates for delivery cost calculation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldRow label="Currency Code" hint="ISO 4217 (e.g. KES, USD, NGN)">
                <Input
                  value={form.currency ?? ""}
                  placeholder="KES"
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                />
              </FieldRow>
              <FieldRow label="Base Delivery Fee" hint="Flat fee charged per delivery.">
                <Input
                  value={form.base_delivery_fee ?? ""}
                  placeholder="150.00"
                  onChange={(e) => set("base_delivery_fee", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Per-km Rate" hint="Additional cost per kilometre.">
                <Input
                  value={form.per_km_rate ?? ""}
                  placeholder="20.00"
                  onChange={(e) => set("per_km_rate", e.target.value)}
                />
              </FieldRow>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeSection === "notifications" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" />
                Notification Triggers
              </CardTitle>
              <CardDescription>
                Control which events send notifications to customers and dispatchers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Toggle
                checked={form.notify_on_dispatch ?? true}
                onChange={(v) => set("notify_on_dispatch", v)}
                label="Notify customer on task dispatch"
              />
              <Toggle
                checked={form.notify_on_delivery ?? true}
                onChange={(v) => set("notify_on_delivery", v)}
                label="Notify customer on delivery completion"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Integrations ── */}
      {activeSection === "integrations" && (
        <IntegrationsSection orgSlug={orgSlug} />
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

function IntegrationsSection({ orgSlug: _orgSlug }: { orgSlug: string }) {
  const [authApiUrl, setAuthApiUrl] = useState(AUTH_API_URL);
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [saving, setSaving] = useState(false);

  const testConnection = async () => {
    setTestStatus("loading");
    try {
      const res = await fetch(`${authApiUrl}/healthz`);
      setTestStatus(res.ok ? "ok" : "fail");
    } catch {
      setTestStatus("fail");
    }
  };

  const handleSave = async () => {
    if (!allowedOrigins.trim()) return;
    setSaving(true);
    try {
      const { api } = await import("@/lib/api/client");
      await api.put("/api/v1/admin/config/allowed_origins", {
        config_value: allowedOrigins,
        config_type: "string",
      });
      toast.success("Integration settings saved.");
    } catch {
      toast.error("Failed to save integration settings.");
    } finally {
      setSaving(false);
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

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-primary" />
            CORS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow
            label="Allowed Origins"
            hint="Comma-separated list of allowed CORS origins."
          >
            <Input
              placeholder="https://app.example.com, https://admin.example.com"
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
            />
          </FieldRow>
          <Button onClick={handleSave} disabled={saving || !allowedOrigins.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving…" : "Save Integrations"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
