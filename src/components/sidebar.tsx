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
  { id: "riders", label: "Riders", href: "/riders", icon: Users, permission: "logistics.fleet.view" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: ClipboardList, permission: "logistics.tasks.view" },
  { id: "tracking", label: "Tracking", href: "/tracking", icon: MapPin, permission: "logistics.telemetry.view" },
  { id: "zones", label: "Zones", href: "/zones", icon: Hexagon, permission: "logistics.zones.view" },
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
    <div className="space-y-4 py-6 flex flex-col h-full bg-brand-dark text-white border-r border-white/10 min-w-[280px]">
        <div className="px-6 py-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-center mb-10 transition-all hover:scale-105 duration-500">
                <Link href={`/${orgSlug}`} onClick={onClose} className="flex items-center">
                    {tenant?.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="h-12 w-auto object-contain drop-shadow-2xl" />
                    ) : (
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <Truck className="text-white h-6 w-6" />
                        </div>
                    )}
                </Link>
            </div>

            <div className="space-y-1 mt-4">
                <div className="px-6 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
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
                                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                    : "text-white/50 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", active ? "text-white" : "group-hover:text-white")} />
                            <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
                        </Link>
                    );
                })}

                {isPlatformOwner && (
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="px-6 mb-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">
                            Platform
                        </div>
                        <div className="space-y-1">
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
                                                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                                : "text-white/50 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", active ? "text-white" : "group-hover:text-white")} />
                                        <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="p-6 border-t border-white/10 mt-auto">
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 text-white/70">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary uppercase shadow-inner">
                    {tenant?.name?.[0] || orgSlug?.[0]}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-black text-[10px] uppercase tracking-widest truncate">{tenant?.name || orgSlug}</span>
                    <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Logistics Node</span>
                </div>
                <button
                    onClick={() => logout()}
                    className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/50 hover:text-rose-400"
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
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0 lg:min-w-[280px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>
    </>
  );
}
