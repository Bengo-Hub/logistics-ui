"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  assignTask,
  createTask,
  dispatchTask,
  fetchTask,
  fetchTasks,
  rateRider,
  submitPoD,
  updateTaskStatus,
  type TasksParams,
} from "@/lib/api/logistics";
import type { Task } from "@/types/logistics";

function useTenantSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? "";
}

export function useTasks(params?: TasksParams) {
  const tenantSlug = useTenantSlug();
  return useQuery({
    queryKey: ["tasks", tenantSlug, params],
    queryFn: () => fetchTasks(tenantSlug, params),
    enabled: !!tenantSlug,
    refetchInterval: 30_000,
  });
}

export function useTask(taskId: string) {
  const tenantSlug = useTenantSlug();
  return useQuery<Task>({
    queryKey: ["task", tenantSlug, taskId],
    queryFn: () => fetchTask(tenantSlug, taskId),
    enabled: !!tenantSlug && !!taskId,
    refetchInterval: 15_000,
  });
}

export function useCreateTask() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createTask>[1]) =>
      createTask(tenantSlug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTaskStatus() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updateTaskStatus(tenantSlug, taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

export function useAssignTask() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, fleetMemberId }: { taskId: string; fleetMemberId: string }) =>
      assignTask(tenantSlug, taskId, fleetMemberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

export function useDispatchTask() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => dispatchTask(tenantSlug, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

export function useSubmitPoD() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, formData }: { taskId: string; formData: FormData }) =>
      submitPoD(tenantSlug, taskId, formData),
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ["task", tenantSlug, taskId] });
    },
  });
}

export function useRateRider() {
  const tenantSlug = useTenantSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      rating,
      comment,
    }: {
      taskId: string;
      rating: number;
      comment?: string;
    }) => rateRider(tenantSlug, taskId, rating, comment),
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ["task", tenantSlug, taskId] });
    },
  });
}
