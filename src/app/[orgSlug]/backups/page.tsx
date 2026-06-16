"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Download,
  Info,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import {
  useBackups,
  useBackupSettings,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useUpdateBackupSettings,
} from "@/hooks/use-backups";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanSize(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatHour(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Auto-backup schedule card ──────────────────────────────────────────────

function AutoBackupCard() {
  const { data: settings, isLoading } = useBackupSettings();
  const { mutateAsync: save, isPending } = useUpdateBackupSettings();

  // Opt-in: default OFF.
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(2);
  const [retention, setRetention] = useState(30);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.auto_enabled);
      setHour(settings.schedule_hour);
      setRetention(settings.retention_days);
    }
  }, [settings]);

  const dirty =
    !settings ||
    settings.auto_enabled !== enabled ||
    settings.schedule_hour !== hour ||
    settings.retention_days !== retention;

  async function handleSave() {
    await save({
      auto_enabled: enabled,
      schedule_hour: hour,
      retention_days: retention,
    });
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-primary" />
          Automatic Backups
        </CardTitle>
        <CardDescription>
          Off by default. When enabled, a backup of your organisation&apos;s data
          runs daily at the chosen hour and older backups are pruned
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30">
          <span className="text-sm font-medium">Enable daily automatic backups</span>
          <button
            role="switch"
            aria-checked={enabled}
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        {/* Daily time */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Daily backup time</label>
          <select
            value={hour}
            disabled={!enabled}
            onChange={(e) => setHour(Number(e.target.value))}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {formatHour(h)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Backups run once per day at this hour (server time).
          </p>
        </div>

        {/* Retention */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Retention (days)</label>
          <Input
            type="number"
            min={1}
            max={365}
            value={retention}
            disabled={!enabled}
            onChange={(e) => setRetention(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Backups older than this are pruned automatically (1–365 days).
          </p>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={handleSave} disabled={isPending || !dirty}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? "Saving…" : "Save schedule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Backups Page ─────────────────────────────────────────────────────────────

export default function BackupsPage() {
  const { data: backups, isLoading } = useBackups();
  const { mutate: create, isPending: creating } = useCreateBackup();
  const { mutate: remove } = useDeleteBackup();
  const { mutate: download, isPending: downloading, variables: downloadingName } =
    useDownloadBackup();

  function handleDelete(name: string) {
    if (
      window.confirm(
        `Delete backup "${name}"? This permanently removes the backup file and cannot be undone.`
      )
    ) {
      remove(name);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backups</h1>
          <p className="text-muted-foreground">
            Create and manage backups of your organisation&apos;s logistics data.
          </p>
        </div>
        <Button onClick={() => create()} disabled={creating}>
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Create backup
        </Button>
      </div>

      <AutoBackupCard />

      {/* Info note */}
      <Card className="border-border bg-muted/30 max-w-2xl">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <p className="text-sm text-muted-foreground">
            These backups contain only your organisation&apos;s data and are
            visible only to you.
          </p>
        </CardContent>
      </Card>

      {/* Backups table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Available backups</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !backups || backups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No backups yet. Click “Create backup” to make one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">File</th>
                    <th className="py-2 font-medium">Size</th>
                    <th className="py-2 font-medium">Created</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.name} className="border-b border-border/60">
                      <td className="py-3 font-medium break-all">{b.name}</td>
                      <td className="py-3 text-muted-foreground">
                        {humanSize(b.size)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatDate(b.created_at)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download"
                            disabled={downloading && downloadingName === b.name}
                            onClick={() => download(b.name)}
                          >
                            {downloading && downloadingName === b.name ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Download className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(b.name)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
