'use client';

import React from 'react';
import { PoweredByBadge } from '@bengo-hub/shared-ui-lib';
import { useBranding } from '@/providers/branding-provider';

export function Footer() {
  const { tenant } = useBranding();
  const tenantName = tenant?.name || 'Codevertex Logistics';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            &copy; {currentYear}{' '}
            <span className="font-semibold text-foreground">{tenantName}</span>
            . All rights reserved.
          </p>

          <PoweredByBadge />
        </div>
      </div>
    </footer>
  );
}
