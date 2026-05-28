"use client";

import { useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { OutletFilter } from "@/components/outlet-filter";
import { Button } from "@/components/ui/base";
import { cn, orgRoute } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Bell, ChevronDown, LogIn, LogOut, Menu, Settings, UserIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranding } from "@/providers/branding-provider";

function displayName(user: { fullName?: string; name?: string; firstName?: string; email?: string } | null): string {
  if (!user) return "Account";
  return (user as { fullName?: string }).fullName ?? (user as { name?: string }).name ?? user.firstName ?? user.email?.split("@")[0] ?? "Account";
}

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
  const role = (user as any)?.roles?.[0] || (user as any)?.role;

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: menu button + page title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="text-base font-black tracking-tight text-foreground uppercase truncate hidden sm:block">
          {getServiceTitle("Logistics")}
        </h1>
      </div>

      {/* Right: outlet filter, bells, theme, profile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <OutletFilter className="hidden md:flex" />

        <button className="relative group p-2.5 rounded-xl hover:bg-muted transition-all">
          <Bell className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
        </button>

        <ThemeToggle />

        <div className="h-7 w-px bg-border mx-1 hidden sm:block" />

        {user ? (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-2xl hover:bg-muted p-1 pr-2 transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 shrink-0 transition-transform group-hover:scale-105">
                {name[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-foreground truncate max-w-27.5 leading-tight">{name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-tight">{role || "Dispatcher"}</p>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 hidden md:block", profileOpen && "rotate-180")} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl p-2 shadow-xl border border-border bg-popover overflow-hidden">
                  <div className="mb-1 px-3 py-2.5">
                    <p className="text-sm font-bold text-popover-foreground">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest mt-0.5">{role || "Dispatcher"}</p>
                  </div>

                  <div className="h-px bg-border mx-2 my-1" />

                  <div className="grid gap-0.5">
                    <Link
                      href={orgRoute(orgSlug, "/settings")}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:text-primary transition-colors shrink-0">
                        <Settings className="h-3.5 w-3.5" />
                      </div>
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); void logout(); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <LogOut className="h-3.5 w-3.5" />
                      </div>
                      Logout
                    </button>
                  </div>
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
