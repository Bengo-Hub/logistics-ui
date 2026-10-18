"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchTenantOutlets, saveOutletPin } from "@/lib/api/outlets";
import { refreshOutlets } from "@/lib/api/logistics";
import { useAuthStore } from "@/store/auth";
import { useOutletFilterStore } from "@/store/outlet-filter";
import type { TenantOutlet } from "@/types/logistics";

/**
 * The tenant's outlets from auth-api (their owner). Feeds the header outlet switcher and
 * preselects the user's last outlet, else the main one, the first time they load. Every
 * caller shares one cached query.
 */
export function useTenantOutlets() {
  const params = useParams();
  const slug = (params?.orgSlug as string) ?? "";
  const token = useAuthStore((s) => s.session?.accessToken ?? "");
  const setOutlets = useOutletFilterStore((s) => s.setOutlets);

  const query = useQuery<TenantOutlet[]>({
    queryKey: ["tenant-outlets", slug],
    queryFn: () => fetchTenantOutlets(token, slug),
    enabled: !!slug && !!token,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!query.data) return;
    setOutlets(
      query.data.map((o) => ({ id: o.id, code: o.code, name: o.name, useCase: o.use_case, isHq: o.is_hq })),
    );
  }, [query.data, setOutlets]);

  return query;
}

/**
 * Saves an outlet's map pin in auth-api, then has logistics pull it in and drops everything
 * derived from outlets (areas, coverage, quotes, fee suggestions).
 */
export function useSaveOutletPin() {
  const params = useParams();
  const slug = (params?.orgSlug as string) ?? "";
  const token = useAuthStore((s) => s.session?.accessToken ?? "");
  const qc = useQueryClient();

  return async (outlet: TenantOutlet, pin: { latitude: number; longitude: number }) => {
    await saveOutletPin(token, slug, outlet, pin);
    try {
      await refreshOutlets(slug);
    } catch {
      // The pin is saved; logistics also learns of it from the outlet event within moments.
    }
    for (const key of ["tenant-outlets", "delivery-coverage", "delivery-quote", "fee-suggestion", "zones"]) {
      await qc.invalidateQueries({ queryKey: [key] });
    }
  };
}
