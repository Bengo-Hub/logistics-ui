"use client";

import { useMe } from "@/hooks/useMe";
import { cn, orgRoute } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Hexagon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Server,
  Settings,
  Shield,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { useBranding } from "@/providers/branding-provider";

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
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", href: "", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Fleet",
    items: [
      { id: "riders", label: "Riders", href: "/riders", icon: Users, permission: "logistics.fleet.view" },
      { id: "vehicles", label: "Vehicles", href: "/vehicles", icon: Truck },
      { id: "zones", label: "Zones", href: "/zones", icon: Hexagon, permission: "logistics.zones.view" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { id: "tasks", label: "Tasks", href: "/tasks", icon: ClipboardList, permission: "logistics.tasks.view" },
      { id: "tracking", label: "Tracking", href: "/tracking", icon: MapPin, permission: "logistics.telemetry.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "earnings", label: "Earnings", href: "/earnings", icon: Wallet, permission: "logistics.earnings.view" },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "rbac", label: "Roles & Perms", href: "/rbac", icon: Shield },
      { id: "settings", label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const platformNav: NavItem[] = [
  { id: "platform", label: "Map Providers", href: "/platform", icon: Server },
  { id: "system-config", label: "System Config", href: "/platform?tab=config", icon: Shield },
];

function canSeeNavItem(
  item: NavItem,
  hasPermission: (p: string) => boolean
): boolean {
  if (item.permission && !hasPermission(item.permission)) return false;
  return true;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = (params.orgSlug as string) || "codevertex";
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { hasPermission, hasRole } = useMe(!!session);
  const { tenant } = useBranding();
  const isPlatformOwner = hasRole("superuser") || hasRole("platform_owner");

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    const full = orgRoute(orgSlug, href);
    if (href === "") return pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`;
    return pathname.startsWith(full.split("?")[0]);
  };

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-white border-r border-white/5">
      {/* Logo band — 88px */}
      <div className="h-[88px] flex items-center justify-center px-4 border-b border-white/5 shrink-0">
        <Link href={`/${orgSlug}`} onClick={onClose} className="flex items-center gap-3">
          {tenant?.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Truck className="text-white h-5 w-5" />
            </div>
          )}
          <span className="font-black text-sm tracking-tight truncate max-w-[120px]">
            {tenant?.name || orgSlug}
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            canSeeNavItem(item, hasPermission)
          );
          if (visibleItems.length === 0) return null;
          const isOpen = !collapsed[group.label];

          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    isOpen ? "" : "-rotate-90"
                  )}
                />
              </button>

              {isOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {visibleItems.map((item) => {
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
                            ? "bg-primary/15 text-primary font-semibold"
                            : "text-white/50 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-primary" : "text-white/40 group-hover:text-white"
                          )}
                        />
                        <span>{item.label}</span>
                        {active && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isPlatformOwner && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
              Platform
            </p>
            <div className="space-y-0.5 mt-0.5">
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
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-white/40 group-hover:text-white"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase shrink-0">
            {tenant?.name?.[0] || orgSlug?.[0]}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-xs text-white truncate">{tenant?.name || orgSlug}</span>
            <span className="text-[10px] text-white/40">Logistics</span>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-rose-400 shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex-1 overflow-hidden">{content}</div>
      </aside>
    </>
  );
}
