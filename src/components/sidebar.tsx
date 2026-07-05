"use client";

import { useMe } from "@/hooks/useMe";
import { useModuleAccess } from "@/hooks/use-module-access";
import { FeatureLock } from "@bengo-hub/shared-ui-lib/subscription";
import { cn, orgRoute } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Database,
  FileText,
  Hexagon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Server,
  Settings,
  Shield,
  Timer,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { useBranding } from "@/providers/branding-provider";
import { OutletSwitcher } from "@/components/outlet-switcher";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  moduleKey?: string;
  /** Subscription feature code that unlocks this item (exempt tenants always pass). */
  feature?: string;
}

interface NavGroup {
  label: string;
  moduleKey?: string;
  defaultCollapsed?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", href: "", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, moduleKey: "analytics", feature: "driver_analytics" },
    ],
  },
  {
    label: "Fleet",
    moduleKey: "fleet",
    items: [
      { id: "riders", label: "Riders", href: "/riders", icon: Users, permission: "logistics.fleet.view" },
      { id: "vehicles", label: "Vehicles", href: "/vehicles", icon: Truck, moduleKey: "vehicles" },
      { id: "shifts", label: "Shifts", href: "/shifts", icon: Timer, moduleKey: "fleet" },
      { id: "zones", label: "Zones", href: "/zones", icon: Hexagon, permission: "logistics.zones.view" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { id: "tasks", label: "Tasks", href: "/tasks", icon: ClipboardList, permission: "logistics.tasks.view" },
      { id: "tracking", label: "Tracking", href: "/tracking", icon: MapPin, permission: "logistics.telemetry.view", feature: "live_tracking" },
    ],
  },
  {
    label: "Distribution",
    moduleKey: "distribution",
    items: [
      { id: "distribution", label: "Shipments", href: "/distribution", icon: Package, moduleKey: "distribution" },
    ],
  },
  {
    label: "Finance",
    defaultCollapsed: true,
    items: [
      { id: "earnings", label: "Earnings", href: "/earnings", icon: Wallet, permission: "logistics.earnings.view", moduleKey: "earnings" },
      { id: "reporting", label: "Reports", href: "/reporting", icon: FileText, moduleKey: "reporting", feature: "performance_reports" },
    ],
  },
  {
    label: "Admin",
    defaultCollapsed: true,
    items: [
      { id: "rbac", label: "Roles & Perms", href: "/rbac", icon: Shield, moduleKey: "rbac" },
      { id: "backups", label: "Backups", href: "/backups", icon: Database },
      { id: "settings", label: "Settings", href: "/settings", icon: Settings, moduleKey: "settings" },
    ],
  },
];

const platformNav: NavItem[] = [
  { id: "system-config", label: "System Config", href: "/platform", icon: Server },
];

function canSeeNavItem(
  item: NavItem,
  hasPermission: (p: string) => boolean,
  hasModule: (k: string) => boolean,
): boolean {
  if (item.moduleKey && !hasModule(item.moduleKey)) return false;
  if (item.permission && !hasPermission(item.permission)) return false;
  // Subscription features (live_tracking, driver_analytics, performance_reports) do NOT hide
  // items anymore — show-don't-hide: locked items render wrapped in <FeatureLock mode="badge">
  // which shows a tier chip and opens the UpgradeDialog on click instead of navigating.
  return true;
}

/**
 * Wraps a nav entry in the shared FeatureLock (badge mode) when it carries a subscription
 * feature code. Unlocked/exempt tenants get the bare children back; locked ones see a tier
 * chip and a click-capture that opens the UpgradeDialog instead of navigating.
 */
function NavFeatureLock({ feature, children }: { feature?: string; children: React.ReactNode }) {
  if (!feature) return <>{children}</>;
  return (
    <FeatureLock feature={feature} mode="badge">
      {children}
    </FeatureLock>
  );
}

// ── Collapsible group ─────────────────────────────────────────────────────────

function NavGroupSection({
  group,
  orgSlug,
  onClose,
  hasPermission,
  hasModule,
  isActive,
}: {
  group: NavGroup;
  orgSlug: string;
  onClose?: () => void;
  hasPermission: (p: string) => boolean;
  hasModule: (k: string) => boolean;
  isActive: (href: string) => boolean;
}) {
  const visibleItems = group.items.filter((item) =>
    canSeeNavItem(item, hasPermission, hasModule),
  );
  if (visibleItems.length === 0) return null;

  const groupHasActive = visibleItems.some((item) => isActive(item.href));
  const [open, setOpen] = useState(!group.defaultCollapsed || groupHasActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 mb-1 py-0.5 group/header"
        aria-expanded={open}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/35 group-hover/header:text-sidebar-foreground/50 transition-colors">
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-sidebar-foreground/30 transition-all duration-200 group-hover/header:text-sidebar-foreground/50",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <NavFeatureLock key={item.id} feature={item.feature}>
                <Link
                  href={orgRoute(orgSlug, item.href)}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 font-medium",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-transform duration-200",
                      !active && "group-hover:scale-110",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </NavFeatureLock>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = (params.orgSlug as string) || "codevertex";
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { hasPermission, hasRole } = useMe(!!session);
  const { hasModule } = useModuleAccess();
  const { tenant } = useBranding();
  const isPlatformOwner = hasRole("superuser") || hasRole("platform_owner");

  const isActive = (href: string) => {
    const full = orgRoute(orgSlug, href);
    if (href === "") return pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`;
    return pathname.startsWith(full.split("?")[0]);
  };

  // Display user info in footer
  const displayName =
    (user as any)?.fullName ||
    (user as any)?.full_name ||
    (user as any)?.firstName ||
    (user as any)?.email?.split("@")[0] ||
    orgSlug;
  const displayInitial = displayName?.[0]?.toUpperCase() ?? "?";
  const primaryRole = (user?.roles ?? [])[0];
  const roleLabel = primaryRole
    ? primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1).replace(/_/g, " ")
    : "Dispatcher";

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo band — 88px fixed height, static */}
      <div className="border-b border-sidebar-border shrink-0 overflow-hidden" style={{ height: "88px" }}>
        {tenant?.logoUrl ? (
          <div className="flex items-center h-full px-3 py-1">
            <img
              src={tenant.logoUrl}
              alt={tenant.name ?? orgSlug}
              className="h-full w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 h-full px-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <Link href={`/${orgSlug}`} onClick={onClose} className="flex-1 min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground truncate block">
                {tenant?.name || orgSlug}
              </span>
              <span className="text-[10px] text-sidebar-foreground/40 font-medium">Logistics</span>
            </Link>
          </div>
        )}
      </div>

      {/* Branch / outlet switcher (HQ users only) */}
      <div className="pt-3">
        <OutletSwitcher />
      </div>

      {/* Nav — scrollable, only this section scrolls */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        {navGroups.map((group) => {
          if (group.moduleKey && !hasModule(group.moduleKey)) return null;
          return (
            <NavGroupSection
              key={group.label}
              group={group}
              orgSlug={orgSlug}
              onClose={onClose}
              hasPermission={hasPermission}
              hasModule={hasModule}
              isActive={isActive}
            />
          );
        })}

        {/* Platform section — superuser only */}
        {isPlatformOwner && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25">
              Platform
            </p>
            <div className="space-y-0.5">
              {platformNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={orgRoute(orgSlug, item.href)}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm",
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold"
                        : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 font-medium",
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform duration-200", !active && "group-hover:scale-110")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User footer — static, never scrolls */}
      <div className="px-3 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-foreground/5">
          <div className="h-8 w-8 rounded-lg bg-primary/25 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{displayInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">{roleLabel}</p>
          </div>
          <button
            onClick={() => logout()}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sidebar-foreground/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-sidebar-foreground/25">
          Powered by Codevertex
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300",
          "lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Mobile close bar */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4 lg:hidden bg-sidebar">
          <span className="text-sm font-semibold text-sidebar-foreground">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">{content}</div>
      </aside>
    </>
  );
}
