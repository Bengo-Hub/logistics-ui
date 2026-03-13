"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/base";
import { orgRoute } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { LogIn, LogOut, Menu, Truck, UserIcon } from "lucide-react";
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
  const name = displayName(user);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Truck className="size-6 text-primary lg:hidden" />
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase bg-gradient-to-r from-brand-orange to-brand-gold bg-clip-text text-transparent">
                {getServiceTitle('Logistics')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-1">
              <span className="hidden text-sm text-muted-foreground md:inline">
                {name}
              </span>
              <Button variant="ghost" size="icon" asChild>
                <Link href={orgRoute(orgSlug, "/settings")}>
                  <UserIcon className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void logout()}>
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => void redirectToSSO(undefined, orgSlug)}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
