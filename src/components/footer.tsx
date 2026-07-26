'use client';

import React from 'react';
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

          <a
            href="https://codevertexafrica.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground text-background text-[10px] font-black tracking-tight uppercase hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/logo/codevertex.png"
              alt="Codevertex"
              className="h-3 w-auto brightness-0 invert dark:brightness-100 dark:invert-0"
            />
            <span>Powered by <span className="text-primary">Codevertex</span></span>
          </a>
        </div>
      </div>
    </footer>
  );
}
