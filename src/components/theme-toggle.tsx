"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = theme === "system" ? resolvedTheme : theme;

  if (!mounted) {
    return <div className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 opacity-0" aria-hidden />;
  }

  const items = [
    { key: "light", Icon: Sun, label: "Light theme", active: current === "light" },
    { key: "dark", Icon: Moon, label: "Dark theme", active: current === "dark" },
    { key: "system", Icon: Monitor, label: "System theme", active: theme === "system" },
  ] as const;

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur">
      {items.map(({ key, Icon, label, active }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTheme(key)}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
            active && "bg-secondary text-foreground",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
