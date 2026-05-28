'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useOutletFilterStore, type OutletOption } from '@/store/outlet-filter';
import { attachOutletIdGetter } from '@/lib/api/client';

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  'https://sso.codevertexitsolutions.com';

function useTenantOutlets() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const tenantSlug = user?.tenantSlug ?? '';
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantSlug || !session?.accessToken) { setLoading(false); return; }
    fetch(`${AUTH_API_URL}/api/v1/tenants/${tenantSlug}/outlets`, {
      headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const list: any[] = Array.isArray(data) ? data : data.outlets ?? data.data ?? [];
        setOutlets(
          list
            .filter((o) => o.status !== 'archived')
            .map((o) => ({ id: o.id, code: o.code, name: o.name, useCase: o.use_case, isHq: o.is_hq })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  return { outlets, loading };
}

/**
 * Outlet (branch) switcher for the logistics sidebar.
 * Shown to admin/manager/platform-owner users only.
 * Keeps the shared outlet-filter store in sync so all API calls
 * include the correct X-Outlet-ID header.
 */
export function OutletSwitcher() {
  const user = useAuthStore((s) => s.user);
  const { selectedOutlet, selectOutlet, setOutlets, outletIdHeader } = useOutletFilterStore();
  const [open, setOpen] = useState(false);
  const { outlets, loading } = useTenantOutlets();

  const canSwitch = !!(
    (user as any)?.isPlatformOwner ||
    (user as any)?.isSuperUser ||
    user?.roles?.some((r: string) =>
      ['admin', 'superuser', 'manager', 'super_admin', 'dispatcher', 'fleet_manager'].includes(r),
    )
  );

  useEffect(() => {
    if (outlets.length > 0) setOutlets(outlets);
  }, [outlets, setOutlets]);

  // Wire outlet ID header so the Axios interceptor always sends X-Outlet-ID
  useEffect(() => {
    attachOutletIdGetter(() => outletIdHeader() || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canSwitch || (!loading && outlets.length <= 1)) return null;

  const activeName = selectedOutlet?.name ?? 'All Branches';
  const activeCode = selectedOutlet?.code;

  function handleSelect(o: OutletOption) {
    selectOutlet(o);
    setOpen(false);
  }

  function handleClear() {
    selectOutlet(null);
    setOpen(false);
  }

  return (
    <div className="relative px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-foreground/8 hover:bg-sidebar-foreground/12 border border-sidebar-foreground/10 transition-colors text-left"
        aria-expanded={open}
        title="Switch branch / outlet"
      >
        <Building2 className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">{activeName}</p>
          {activeCode && (
            <p className="text-[9px] text-sidebar-foreground/40 font-medium">{activeCode}</p>
          )}
        </div>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 text-sidebar-foreground/40 animate-spin shrink-0" />
        ) : (
          <ChevronDown className={cn('h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
        )}
      </button>

      {open && !loading && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 rounded-xl border border-sidebar-border bg-sidebar shadow-xl shadow-black/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-sidebar-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Switch Branch</p>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                onClick={handleClear}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sidebar-foreground/8 transition-colors text-left"
              >
                <div className="h-6 w-6 rounded-lg bg-sidebar-foreground/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-3 w-3 text-sidebar-foreground/50" />
                </div>
                <span className="text-xs font-medium text-sidebar-foreground/70 flex-1">All Branches</span>
                {!selectedOutlet && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>

              {outlets.map((o) => {
                const isActive = selectedOutlet?.id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleSelect(o)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sidebar-foreground/8 transition-colors text-left"
                  >
                    <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold', isActive ? 'bg-primary/20 text-primary' : 'bg-sidebar-foreground/10 text-sidebar-foreground/50')}>
                      {o.code?.slice(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium truncate', isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/70')}>{o.name}</p>
                      {o.useCase && <p className="text-[9px] text-sidebar-foreground/40">{o.useCase.replace('_', ' ')}</p>}
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
