"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface PaginationDefaults {
  page?: number;
  pageSize?: number;
}

export function usePagination(defaults?: PaginationDefaults) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? defaults?.page ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? defaults?.pageSize ?? 20);

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setPageSize = useCallback(
    (newSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pageSize", String(newSize));
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const paginationParams = useMemo(
    () => ({ page, limit: pageSize }),
    [page, pageSize]
  );

  return { page, pageSize, setPage, setPageSize, paginationParams };
}
