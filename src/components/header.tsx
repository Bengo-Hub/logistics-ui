"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LogIn, LogOut, Menu, Truck, UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/base";
import { useAuthStore } from "@/store/auth";
import { orgRoute } from "@/lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const params = useParams();
  const orgSlug = (params.orgSlug as string) || "codevertex";
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <Link
            href={orgRoute(orgSlug, "")}
            className="flex items-center gap-2 text-base font-bold text-foreground"
          >
            <Truck className="size-6 text-primary" />
            <span className="hidden sm:inline">BengoBox Logistics</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-1">
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user.firstName}
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
            <Button size="sm" onClick={() => void redirectToSSO()}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
