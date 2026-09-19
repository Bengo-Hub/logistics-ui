"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useNotifications, useNotificationStream } from "@/hooks/use-notifications";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const unreadCount = data?.total ?? 0;

  useNotificationStream((n) => {
    toast.info(n.title, { description: n.body || undefined });
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative group p-2.5 rounded-xl hover:bg-muted transition-all"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[16px] h-4 flex items-center justify-center bg-destructive text-white text-[9px] font-bold rounded-full px-0.5 border-2 border-background leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
