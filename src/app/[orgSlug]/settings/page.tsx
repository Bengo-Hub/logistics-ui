"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  Bike,
  Camera,
  CreditCard,
  Layers,
  Loader2,
  MapPinned,
  Save,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/base";
import { useServiceConfig, useUpdateServiceConfig } from "@/hooks/use-service-config";
import { useModuleAccess, useModulesConfig, useMyPermissions, useUpdateModules } from "@/hooks/use-module-access";
import type { ServiceConfigMap } from "@/types/logistics";

// Settings shows only settings the API acts on. Everything else has one home elsewhere
// (delivery areas and pricing, rider pay, riders, roles, plan) and is linked from here.

const PRICING_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL ?? "https://pricing.codevertexafrica.com";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  fleet: "Riders and fleet",
  dispatch: "Dispatch board",
  tracking: "Live tracking",
  analytics: "Analytics",
  earnings: "Earnings and payouts",
  vehicles: "Vehicles",
  pricing: "Pricing",
  distribution: "Distribution",
  cold_chain: "Cold chain monitoring",
  smart_locks: "Smart locks",
  rbac: "Roles and permissions",
  settings: "Settings",
  reporting: "Reporting",
  shifts: "Shifts",
};

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? "";
  const { hasPermission } = useMyPermissions();
  const canManage = hasPermission("logistics.config.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">How dispatch and deliveries run for your business.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <OperationsCard canManage={canManage} />
          <ModulesCard />
        </div>
        <ElsewhereCard orgSlug={orgSlug} />
      </div>
    </div>
  );
}

// ─── Dispatch and delivery ───────────────────────────────────────────────────

type OpsKey = "auto_assign_enabled" | "pod_required";

const OPS: Array<{ key: OpsKey; icon: typeof Zap; title: string; on: string; off: string }> = [
  {
    key: "auto_assign_enabled",
    icon: Zap,
    title: "Auto-assign new deliveries",
    on: "New delivery jobs go to the nearest available rider on shift.",
    off: "Jobs wait on the dispatch board until a dispatcher assigns them.",
  },
  {
    key: "pod_required",
    icon: Camera,
    title: "Require proof of delivery",
    on: "Riders finish a job by submitting proof (photo, signature or code). Dispatchers can still close a job by hand.",
    off: "Riders can mark a job delivered without proof.",
  },
];

function OperationsCard({ canManage }: { canManage: boolean }) {
  const { data: config, isLoading } = useServiceConfig();
  const { mutateAsync: saveConfig, isPending } = useUpdateServiceConfig();
  const [form, setForm] = useState<Partial<ServiceConfigMap>>({});

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  // Only keys the admin changed are saved.
  const changes = useMemo(() => {
    const out: Partial<ServiceConfigMap> = {};
    for (const { key } of OPS) {
      if (form[key] !== undefined && form[key] !== config?.[key]) out[key] = form[key];
    }
    return out;
  }, [form, config]);
  const dirty = Object.keys(changes).length > 0;

  const save = async () => {
    try {
      await saveConfig(changes);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch and delivery</CardTitle>
        <CardDescription>Applies to every outlet in this business.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading settings...
          </div>
        ) : (
          OPS.map(({ key, icon: Icon, title, on, off }) => {
            // Both default to on when never saved (the API's defaults).
            const value = form[key] ?? true;
            return (
              <div key={key} className="flex items-start gap-4 rounded-xl border border-border p-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{value ? on : off}</p>
                </div>
                <Switch
                  checked={value}
                  disabled={!canManage}
                  onChange={(v) => setForm((p) => ({ ...p, [key]: v }))}
                  label={title}
                />
              </div>
            );
          })
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            {canManage ? (dirty ? "You have unsaved changes." : "Changes apply as soon as they are saved.") : "You need the settings permission to change these."}
          </p>
          <Button onClick={save} disabled={!canManage || !dirty || isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modules ─────────────────────────────────────────────────────────────────

function ModulesCard() {
  const { isPlatformOwner, enabledModules } = useModuleAccess();
  const { data: modulesConfig, isLoading } = useModulesConfig();
  const { mutateAsync: saveModules, isPending } = useUpdateModules();
  const saved = modulesConfig?.enabled_modules ?? enabledModules;
  const all = modulesConfig?.all_modules ?? Object.keys(MODULE_LABELS);
  const [selected, setSelected] = useState<string[]>([]);

  // Load the saved selection whenever it arrives or changes.
  useEffect(() => {
    setSelected(saved && saved.length > 0 ? saved : all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesConfig]);

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const save = async () => {
    try {
      await saveModules(selected);
      toast.success("Modules saved");
    } catch {
      toast.error("Could not save modules");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Modules
            </CardTitle>
            <CardDescription>
              {isPlatformOwner
                ? "Choose which parts of logistics this business sees. Plan features still apply."
                : "Parts of logistics turned on for your business. Ask the platform team to change them."}
            </CardDescription>
          </div>
          {!isPlatformOwner && <Badge variant="secondary">Managed by the platform</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading modules...
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {all.map((key) => {
              const checked = isPlatformOwner ? selected.includes(key) : (enabledModules.length === 0 || enabledModules.includes(key));
              return (
                <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm">{MODULE_LABELS[key] ?? key}</span>
                  <Switch checked={checked} disabled={!isPlatformOwner} onChange={() => toggle(key)} label={MODULE_LABELS[key] ?? key} />
                </div>
              );
            })}
          </div>
        )}
        {isPlatformOwner && (
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save modules
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Where the rest lives ────────────────────────────────────────────────────

function ElsewhereCard({ orgSlug }: { orgSlug: string }) {
  const links = [
    { href: `/${orgSlug}/zones`, icon: MapPinned, title: "Delivery areas and pricing", text: "Areas, fees, distance rate and how far you deliver." },
    { href: `/${orgSlug}/earnings?tab=pricing`, icon: Wallet, title: "Rider pay rules", text: "What freelance riders earn per delivery." },
    { href: `/${orgSlug}/riders`, icon: Bike, title: "Riders", text: "Add riders, staff or freelance, and review KYC." },
    { href: `/${orgSlug}/rbac`, icon: ShieldCheck, title: "Roles and permissions", text: "Who can dispatch, manage riders or change settings." },
  ];
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Also configured</CardTitle>
        <CardDescription>Each setting has one home.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {links.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
        <a
          href={`${PRICING_URL}/plans?service=logistics`}
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted"
        >
          <CreditCard className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-medium">
              Plan and limits <ArrowUpRight className="size-3.5 opacity-60" />
            </span>
            <span className="block text-xs text-muted-foreground">Rider limits, live tracking and other plan features.</span>
          </span>
        </a>
      </CardContent>
    </Card>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
