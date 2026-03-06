"use client";

import { useMe } from "@/hooks/useMe";
import { cn, orgRoute } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MapPin,
  Hexagon,
  Settings,
  Shield,
  Server,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const mainNav = [
  { id: "dashboard", label: "Dashboard", href: "", icon: LayoutDashboard },
  { id: "riders", label: "Riders", href: "/riders", icon: Users },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: ClipboardList },
  { id: "tracking", label: "Tracking", href: "/tracking", icon: MapPin },
  { id: "zones", label: "Zones", href: "/zones", icon: Hexagon },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const platformNav = [
  { id: "platform", label: "Map Providers", href: "/platform", icon: Server },
  { id: "system-config", label: "System Config", href: "/platform?tab=config", icon: Shield },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = (params.orgSlug as string) || "codevertex";
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const { data: me } = useMe(!!session);
  const roles = me?.roles ?? (me?.role ? [me.role] : []) ?? (user ? [user.role] : []);
  const isSuperAdmin = roles.includes("super_admin");

  const isActive = (href: string) => {
    const full = orgRoute(orgSlug, href);
    if (href === "") return pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`;
    return pathname.startsWith(full.split("?")[0]);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Mobile close */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <span className="text-sm font-bold text-foreground">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 pb-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Operations
            </p>
          </div>
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={orgRoute(orgSlug, item.href)}
                onClick={onClose}
                className={cn(
                  "mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isSuperAdmin && (
            <>
              <div className="px-3 pb-2 pt-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform
                </p>
              </div>
              {platformNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={orgRoute(orgSlug, item.href)}
                    onClick={onClose}
                    className={cn(
                      "mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
