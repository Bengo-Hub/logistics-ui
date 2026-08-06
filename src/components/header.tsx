"use client";

import { useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/base";
import { cn, orgRoute } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useOutletFilterStore } from "@/store/outlet-filter";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranding } from "@/providers/branding-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { useVisibleServices, type ServiceKey } from "@bengo-hub/shared-ui-lib/app-switcher";

// logistics-ui intentionally links to only a curated subset of the shared registry (dispatchers
// don't need POS/Inventory/etc. shortcuts) — `include` restricts to just these keys, so new/
// coming-soon entries (Projects, Afya, Sourcing, Traceability, Ticketing) stay in sync with the
// canonical list without pulling in the full cross-service set. See use-visible-services.ts.
const LOGISTICS_SERVICE_KEYS: ServiceKey[] = [
  "auth",
  "subscriptions",
  "projects",
  "afya",
  "sourcing",
  "traceability",
  "ticketing",
];
const SERVICE_URLS: Partial<Record<ServiceKey, string>> = {
  auth: process.env.NEXT_PUBLIC_SSO_URL ?? "https://sso.codevertexafrica.com",
  subscriptions: process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL ?? "https://pricing.codevertexafrica.com",
  projects: process.env.NEXT_PUBLIC_PROJECTS_UI_URL ?? "https://projects.codevertexafrica.com",
  afya: process.env.NEXT_PUBLIC_HOSPITAL_UI_URL ?? "https://afya.codevertexafrica.com",
};

function displayName(
  user: { fullName?: string; name?: string; firstName?: string; email?: string } | null,
): string {
  if (!user) return "Account";
  return (
    (user as any).fullName ??
    (user as any).full_name ??
    (user as any).name ??
    (user as any).firstName ??
    user.email?.split("@")[0] ??
    "Account"
  );
}

// ── Outlet context chip shown in the header (read-only when can't switch) ─────

function HeaderOutletChip() {
  const { selectedOutlet, outlets, selectOutlet } = useOutletFilterStore();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const canSwitch = !!(
    (user as any)?.isPlatformOwner ||
    (user as any)?.isSuperUser ||
    user?.roles?.some((r: string) =>
      ["admin", "superuser", "manager", "super_admin", "fleet_manager", "dispatcher"].includes(r),
    )
  );

  // Only render when an outlet is actually selected (context chip, not full picker)
  if (!selectedOutlet && outlets.length === 0) return null;

  const activeName = selectedOutlet?.name ?? "All Branches";
  const chipBase =
    "hidden lg:flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-muted-foreground shrink-0";

  if (!canSwitch) {
    return (
      <div className={chipBase}>
        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate max-w-[7.5rem]">{activeName}</span>
      </div>
    );
  }

  return (
    <div className="relative hidden lg:block shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(chipBase, "hover:bg-muted hover:text-foreground transition-colors cursor-pointer")}
        title="Switch branch"
      >
        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate max-w-[7.5rem]">{activeName}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && outlets.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Switch Branch</p>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => { selectOutlet(null); setOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left", !selectedOutlet && "bg-primary/5 text-primary")}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">All Branches</span>
                {!selectedOutlet && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
              {outlets.map((o) => {
                const isActive = selectedOutlet?.id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { selectOutlet(o); setOpen(false); }}
                    className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left", isActive && "bg-primary/5")}
                  >
                    <span className={cn("h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                      {o.code?.slice(0, 2).toUpperCase() ?? "??"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{o.name}</p>
                      {o.useCase && <p className="text-[10px] text-muted-foreground">{o.useCase.replace("_", " ")}</p>}
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const params = useParams();
  const orgSlug = (params.orgSlug as string) || "codevertex";
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);
  const { getServiceTitle } = useBranding();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const name = displayName(user);
  const role = (user?.roles ?? [])[0];
  // No RBAC gating today (matches prior behavior) — canManageLinks always true so 'coming-soon'
  // + always-on entries show. activeProducts is undefined while the subscription lookup is in
  // flight/unknown — fails open (shows everything) until it resolves, matching this codebase's
  // existing "never block the UI on a subscription-fetch failure" convention.
  const { activeProducts } = useSubscription();
  const services = useVisibleServices({
    orgSlug,
    urls: SERVICE_URLS,
    canManageLinks: true,
    include: LOGISTICS_SERVICE_KEYS,
    activeServiceTags: activeProducts,
  });

  return (
    <header className="h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center gap-4 shrink-0">
      {/* Left: hamburger + title + search + outlet chip */}
      <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-6 min-w-0">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase truncate max-w-[150px] sm:max-w-none shrink-0">
            {getServiceTitle("Logistics")}
          </h1>

          {/* Search — desktop only */}
          <div className="hidden lg:flex relative w-64 max-w-full group shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search tasks, riders..."
              className="w-full h-10 bg-muted/50 border-none rounded-xl py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            />
          </div>
        </div>

        {/* Outlet context chip */}
        <HeaderOutletChip />
      </div>

      {/* Right: logout + bell + theme + profile */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Logout shortcut — rose pill, matches POS */}
        {user && (
          <button
            type="button"
            onClick={() => void logout()}
            title="Logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-bold"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}

        {/* Notification bell */}
        <button className="relative group p-2.5 rounded-xl hover:bg-muted transition-all">
          <Bell className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
        </button>

        <ThemeToggle />

        <div className="h-8 w-px bg-border mx-1 hidden sm:block" />

        {user ? (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-3 rounded-2xl hover:bg-muted p-1 pr-2 transition-all group"
              aria-expanded={profileOpen}
            >
              {/* Gradient avatar — matches POS */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-primary/20 shrink-0 transition-transform group-hover:scale-105">
                {name[0]?.toUpperCase() ?? <UserIcon className="h-5 w-5" />}
              </div>
              <div className="hidden md:block text-left mr-1">
                <p className="text-xs font-black text-foreground truncate max-w-[120px]">{name}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{role || "Dispatcher"}</p>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", profileOpen && "rotate-180")} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-[1.5rem] p-3 shadow-2xl border border-border bg-popover overflow-hidden">
                  <div className="mb-2 px-3 py-2">
                    <p className="text-sm font-black text-popover-foreground">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-widest mt-0.5">{role || "Dispatcher"}</p>
                  </div>

                  <div className="h-px bg-border mx-1 my-2" />

                  <div className="grid gap-1">
                    <Link
                      href={orgRoute(orgSlug, "/settings")}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-popover-foreground hover:bg-muted transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:text-primary transition-colors shrink-0">
                        <Settings className="h-4 w-4" />
                      </div>
                      Settings
                    </Link>
                  </div>

                  <div className="h-px bg-border mx-1 my-2" />

                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-1.5">Services</p>
                  <div className="grid gap-1">
                    {services.map(({ key, label, href, Icon }) =>
                      href ? (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-popover-foreground hover:bg-muted transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:text-primary transition-colors shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{label}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
                        </a>
                      ) : (
                        <div
                          key={key}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground/60 cursor-default"
                          title={`${label} — coming soon`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-full">Soon</span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="h-px bg-border mx-1 my-2" />

                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); void logout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                      <LogOut className="h-4 w-4" />
                    </div>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Button size="sm" onClick={() => void redirectToSSO(undefined, orgSlug)} className="rounded-xl px-5">
            <LogIn className="size-3.5 mr-1.5" />
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
