"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  fetchBackups,
  fetchBackupSettings,
  updateBackupSettings,
  type Backup,
  type BackupSettings,
} from "@/lib/api/backups";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useBackups() {
  const tenantSlug = useTenantSlug();
  return useQuery<Backup[]>({
    queryKey: ["backups", tenantSlug],
    queryFn: () => fetchBackups(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useCreateBackup() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createBackup(tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups", tenantSlug] });
      toast.success("Backup created.");
    },
    onError: () => {
      toast.error("Failed to create backup. Please try again.");
    },
  });
}

export function useDeleteBackup() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteBackup(tenantSlug, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups", tenantSlug] });
      toast.success("Backup deleted.");
    },
    onError: () => {
      toast.error("Failed to delete backup. Please try again.");
    },
  });
}

export function useDownloadBackup() {
  const tenantSlug = useTenantSlug();
  return useMutation({
    mutationFn: (name: string) => downloadBackup(tenantSlug, name),
    onError: () => {
      toast.error("Failed to download backup. Please try again.");
    },
  });
}

export function useBackupSettings() {
  const tenantSlug = useTenantSlug();
  return useQuery<BackupSettings>({
    queryKey: ["backup-settings", tenantSlug],
    queryFn: () => fetchBackupSettings(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useUpdateBackupSettings() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BackupSettings) => updateBackupSettings(tenantSlug, body),
    onSuccess: (data) => {
      qc.setQueryData(["backup-settings", tenantSlug], data);
      toast.success("Backup schedule saved.");
    },
    onError: () => {
      toast.error("Failed to save backup schedule. Please try again.");
    },
  });
}
