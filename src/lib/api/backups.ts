import { api } from "@/lib/api/client";

// ─── Backups ────────────────────────────────────────────────────────────────
//
// Tenant-scoped database backups. All endpoints are nested under the org slug,
// matching the rest of the logistics API (e.g. `${tenantSlug}/backups`).
// Backups contain only the requesting organisation's data and are visible only
// to that tenant.

export interface Backup {
  name: string;
  size: number;
  created_at: string;
}

export interface BackupSettings {
  auto_enabled: boolean;
  schedule_hour: number;
  retention_days: number;
}

export async function fetchBackups(tenantSlug: string): Promise<Backup[]> {
  const { data } = await api.get(`${tenantSlug}/backups`);
  return data?.backups ?? [];
}

export async function createBackup(tenantSlug: string): Promise<Backup> {
  const { data } = await api.post(`${tenantSlug}/backups`, {});
  return data;
}

export async function deleteBackup(tenantSlug: string, name: string): Promise<void> {
  await api.delete(`${tenantSlug}/backups/${encodeURIComponent(name)}`);
}

export async function fetchBackupSettings(
  tenantSlug: string
): Promise<BackupSettings> {
  const { data } = await api.get(`${tenantSlug}/backups/settings`);
  return data;
}

export async function updateBackupSettings(
  tenantSlug: string,
  body: BackupSettings
): Promise<BackupSettings> {
  const { data } = await api.put(`${tenantSlug}/backups/settings`, body);
  return data;
}

/**
 * Download a backup as a gzip blob. The shared axios client has no dedicated
 * blob helper, so we request `responseType: "blob"` (auth/tenant headers are
 * still injected by the request interceptor) and trigger a browser download via
 * an anchor, mirroring the CSV-export download in the reporting page.
 */
export async function downloadBackup(
  tenantSlug: string,
  name: string
): Promise<void> {
  const { data } = await api.get(
    `${tenantSlug}/backups/${encodeURIComponent(name)}/download`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
