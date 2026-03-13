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
  Truck,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useBranding } from "@/providers/branding-provider";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const mainNav: Array<{
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  role?: string;
}> = [
  { id: "dashboard", label: "Dashboard", href: "", icon: LayoutDashboard },
  { id: "riders", label: "Riders", href: "/riders", icon: Users, permission: "riders:read" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: ClipboardList, permission: "tasks:read" },
  { id: "tracking", label: "Tracking", href: "/tracking", icon: MapPin, permission: "tracking:read" },
  { id: "zones", label: "Zones", href: "/zones", icon: Hexagon, permission: "zones:read" },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const platformNav = [
  { id: "platform", label: "Map Providers", href: "/platform", icon: Server },
  { id: "system-config", label: "System Config", href: "/platform?tab=config", icon: Shield },
];

function canSeeNavItem(
  item: (typeof mainNav)[0],
  hasRole: (r: string) => boolean,
  hasPermission: (p: string) => boolean
) {
  if (item.role && !hasRole(item.role)) return false;
  if (item.permission && !hasPermission(item.permission)) return false;
  return true;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = (params.orgSlug as string) || "codevertex";
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { hasRole, hasPermission } = useMe(!!session);
  const { tenant } = useBranding();
  const isPlatformOwner = orgSlug === 'codevertex';
  const visibleMainNav = mainNav.filter((item) => canSeeNavItem(item, hasRole, hasPermission));

  const isActive = (href: string) => {
    const full = orgRoute(orgSlug, href);
    if (href === "") return pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`;
    return pathname.startsWith(full.split("?")[0]);
  };

  const content = (
    <div className="space-y-4 py-4 flex flex-col h-full bg-brand-dark text-brand-light border-r border-white/10 min-w-[260px]">
        <div className="px-6 py-4 flex-1">
            <div className="flex items-center justify-between mb-12">
                <Link href={`/${orgSlug}`} onClick={onClose} className="flex items-center">
                    {tenant?.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-auto object-contain" />
                    ) : (
                        <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center shadow-glow-orange">
                            <Truck className="text-white h-6 w-6" />
                        </div>
                    )}
                </Link>
                <button onClick={onClose} className="md:hidden opacity-80 hover:opacity-100 p-2">
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div className="space-y-2">
                <div className="px-6 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-beige opacity-50">
                        Operations
                    </p>
                </div>
                {visibleMainNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={orgRoute(orgSlug, item.href)}
                            onClick={onClose}
                            className={cn(
                                "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                active 
                                    ? "bg-brand-orange text-white shadow-glow-orange" 
                                    : "opacity-70 hover:opacity-100 hover:bg-white/5"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", active ? "text-white" : "text-brand-beige")} />
                            <span className="font-bold tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}

                {isPlatformOwner && (
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="px-6 mb-4 text-[10px] text-brand-beige uppercase tracking-[0.2em] font-black opacity-50">
                            Platform
                        </div>
                        <div className="space-y-2">
                            {platformNav.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.id}
                                        href={orgRoute(orgSlug, item.href)}
                                        onClick={onClose}
                                        className={cn(
                                            "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                            active 
                                                ? "bg-brand-orange text-white shadow-glow-orange" 
                                                : "opacity-70 hover:opacity-100 hover:bg-white/5"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5", active ? "text-white" : "text-brand-beige")} />
                                        <span className="font-bold tracking-tight">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="px-6 py-6 border-t border-white/10 mt-auto">
            <div className="flex items-center gap-4 px-6 py-4 opacity-70">
                <div className="w-8 h-8 rounded-xl bg-brand-orange/20 flex items-center justify-center text-xs font-black text-brand-orange uppercase">
                    {tenant?.name?.[0] || orgSlug?.[0]}
                </div>
                <span className="font-bold tracking-tight truncate flex-1 uppercase text-xs opacity-70">{tenant?.name || orgSlug}</span>
                <button
                    onClick={() => logout()}
                    className="p-2 rounded-xl hover:bg-white/5 transition-colors text-brand-beige hover:text-red-400"
                    title="Sign out"
                >
                    <LogOut className="h-5 w-5" />
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
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>
    </>
  );
}
