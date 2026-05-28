'use client';

import { useAuthStore } from '@/store/auth';
import { useOutletFilterStore, type OutletOption } from '@/store/outlet-filter';
import { attachOutletIdGetter } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Store, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  'https://sso.codevertexitsolutions.com';

interface OutletListItem {
  id: string;
  code: string;
  name: string;
  use_case?: string;
  is_hq?: boolean;
  status?: string;
}

async function fetchOutlets(accessToken: string, tenantSlug: string): Promise<OutletListItem[]> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/${tenantSlug}/outlets`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const list: OutletListItem[] = Array.isArray(data) ? data : data.outlets ?? data.data ?? [];
  return list.filter((o) => o.status !== 'archived');
}

/**
 * Compact outlet/branch selector — for mobile header use.
 * Desktop branch switching is handled by OutletSwitcher in the sidebar.
 */
export function OutletFilter({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const canFilter = !!(
    (user as any)?.isPlatformOwner ||
    (user as any)?.isSuperUser ||
    user?.roles?.some((r: string) =>
      ['admin', 'superuser', 'manager', 'super_admin', 'fleet_manager', 'dispatcher'].includes(r),
    )
  );

  const { selectedOutlet, outlets, setOutlets, selectOutlet, clearOutlet, outletIdHeader } =
    useOutletFilterStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const slug = user?.tenantSlug || (user as any)?.tenant_slug || '';

  const { data: fetched = [] } = useQuery<OutletListItem[]>({
    queryKey: ['outlet_list', slug],
    queryFn: () => fetchOutlets(session?.accessToken ?? '', slug),
    enabled: canFilter && !!session?.accessToken && !!slug,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (fetched.length > 0) {
      setOutlets(
        fetched.map((o) => ({
          id: o.id,
          code: o.code,
          name: o.name,
          useCase: o.use_case,
          isHq: o.is_hq,
        })),
      );
    }
  }, [fetched, setOutlets]);

  // Wire outlet ID so Axios interceptor sends X-Outlet-ID
  useEffect(() => {
    attachOutletIdGetter(() => outletIdHeader() || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canFilter || outlets.length === 0) return null;

  const filtered = search
    ? outlets.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.code.toLowerCase().includes(search.toLowerCase()),
      )
    : outlets;

  const label = selectedOutlet ? selectedOutlet.name : 'All Branches';

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-w-40"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Store className="size-4 text-primary shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        {selectedOutlet && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearOutlet(); }}
            className="p-0.5 rounded hover:bg-muted"
            aria-label="Clear branch filter"
          >
            <X className="size-3" />
          </button>
        )}
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-border bg-popover shadow-xl flex flex-col overflow-hidden">
            {outlets.length > 5 && (
              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  placeholder="Search branches…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => { clearOutlet(); setOpen(false); setSearch(''); }}
              className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                !selectedOutlet && 'bg-primary/10 text-primary',
              )}
            >
              {!selectedOutlet ? <Check className="size-3.5 shrink-0" /> : <span className="size-3.5 shrink-0" />}
              All Branches
            </button>

            <div className="max-h-56 overflow-y-auto">
              {filtered.map((o) => {
                const selected = selectedOutlet?.id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { selectOutlet(o); setOpen(false); setSearch(''); }}
                    className={cn(
                      'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors',
                      selected && 'bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'size-3.5 shrink-0 rounded-full border flex items-center justify-center',
                      selected ? 'bg-primary border-primary' : 'border-border',
                    )}>
                      {selected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium text-popover-foreground">{o.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {o.code}{o.useCase ? ` · ${o.useCase}` : ''}{o.isHq ? ' · HQ' : ''}
                      </span>
                    </span>
                    {selected && <Check className="size-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">No branches found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
