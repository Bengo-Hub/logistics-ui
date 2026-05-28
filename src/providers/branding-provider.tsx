import { fetchTenantBySlug, type TenantBrand } from '@/lib/api/tenant';
import { useParams } from 'next/navigation';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

function hexToRgbTriplet(hex: string): string {
  const t = hex.replace(/^#/, '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(t)) return '234 128 34';
  return `${parseInt(t.slice(0, 2), 16)} ${parseInt(t.slice(2, 4), 16)} ${parseInt(t.slice(4, 6), 16)}`;
}

function hexToHslComponents(hex: string): { h: number; s: number; l: number } {
  const t = hex.replace(/^#/, '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(t)) return { h: 28, s: 83, l: 53 };
  const r = parseInt(t.slice(0, 2), 16) / 255;
  const g = parseInt(t.slice(2, 4), 16) / 255;
  const b = parseInt(t.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hexToHslTriplet(hex: string): string {
  const { h, s, l } = hexToHslComponents(hex);
  return `${h} ${s}% ${l}%`;
}

function hslToRgbTriplet(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return `${Math.round((r + m) * 255)} ${Math.round((g + m) * 255)} ${Math.round((b + m) * 255)}`;
}

interface BrandingContextType {
  slug: string;
  tenant: TenantBrand | null;
  isLoading: boolean;
  error: Error | null;
  getServiceTitle: (appName: string) => string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const DEFAULT_BRAND: TenantBrand = {
  id: 'platform',
  name: 'Codevertex',
  slug: 'codevertex',
  logoUrl: '/images/logo/codevertex.png',
  primaryColor: '#ea8022',
  secondaryColor: '#ae6221',
  orgName: 'Codevertex Africa Limited',
};

export function BrandingProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const slug = (params?.orgSlug as string) || '';

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', slug],
    queryFn: () => fetchTenantBySlug(slug),
    staleTime: 6 * 60 * 60 * 1000,
    enabled: !!slug,
  });

  const effectiveBrand = useMemo(() => {
    if (tenant) return tenant;
    if (!isLoading && !tenant && slug) {
      return { ...DEFAULT_BRAND, slug, name: slug, orgName: slug };
    }
    return DEFAULT_BRAND;
  }, [tenant, isLoading, slug]);

  useMemo(() => {
    if (typeof window !== 'undefined') {
      const primary = effectiveBrand?.primaryColor || DEFAULT_BRAND.primaryColor!;
      const secondary = effectiveBrand?.secondaryColor || DEFAULT_BRAND.secondaryColor!;
      const logo = effectiveBrand?.logoUrl || DEFAULT_BRAND.logoUrl!;
      const root = document.documentElement;

      root.style.setProperty('--tenant-primary', primary);
      root.style.setProperty('--tenant-secondary', secondary);
      root.style.setProperty('--tenant-logo-url', `url(${logo})`);
      // Drive Tailwind semantic tokens from tenant brand color
      const hsl = hexToHslComponents(primary);
      root.style.setProperty('--primary', hexToHslTriplet(primary));
      root.style.setProperty('--primary-dark', `${hsl.h} 68% 40%`);
      root.style.setProperty('--ring', hexToHslTriplet(primary));
      // Drive brand RGB triplets for bg-brand-primary / bg-brand-emphasis / bg-brand-dark
      root.style.setProperty('--brand-primary', hexToRgbTriplet(primary));
      root.style.setProperty('--brand-emphasis', hexToRgbTriplet(secondary));
      root.style.setProperty('--brand-dark', hslToRgbTriplet(hsl.h, 38, 7));
      root.style.setProperty('--brand-light', hslToRgbTriplet(hsl.h, 30, 96));
    }
  }, [effectiveBrand]);

  const getServiceTitle = (appName: string) => {
    const tenantName = effectiveBrand?.orgName || effectiveBrand?.name || '';
    const firstWord = tenantName.split(' ')[0] || 'Codevertex';
    return `${firstWord} ${appName}`;
  };

  const value = useMemo(
    () => ({
      slug,
      tenant: effectiveBrand,
      isLoading,
      error: error as Error | null,
      getServiceTitle,
    }),
    [slug, effectiveBrand, isLoading, error]
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      slug: '',
      tenant: null,
      isLoading: false,
      error: null,
      getServiceTitle: (s: string) => s,
    };
  }
  return context;
};
