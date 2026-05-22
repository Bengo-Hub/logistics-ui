# Logistics UI – Claude Code Guide

## Service
Next.js 15 dispatcher console for fleet/rider management, task operations, and live tracking.  
**Production**: `https://logistics.codevertexitsolutions.com`  
**K8s namespace**: `logistics`

## Architecture
- **Framework**: Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI
- **State**: TanStack Query v5 for server state; Zustand for auth/local state
- **API**: shared Axios client (`lib/api/client.ts`) → `https://logisticsapi.codevertexitsolutions.com/api/v1/{orgSlug}/*`
- **Auth**: SSO PKCE via auth-api; JWT Bearer injected by Axios interceptor
- **RBAC**: `useMe` → `hasRole`/`hasPermission` helpers from `lib/auth`

## Key Directories
```
src/
  app/
    [orgSlug]/        # All authenticated pages (tenant-scoped)
      riders/         # Fleet member list + detail
      tasks/          # Task list + detail
      tracking/       # Live tracking map (SSE)
      zones/          # Geo-fence zone editor
      earnings/       # Pricing rules, statements (Sprint 4)
      settings/       # Service config
    track/            # Public tracking page (no auth)
  hooks/              # TanStack Query hooks (one file per domain)
  lib/api/            # Axios client, domain API functions
  components/         # Reusable UI components
  types/logistics.ts  # Shared TypeScript types
```

## Development Commands
```bash
pnpm install        # install deps
pnpm dev            # start dev server
pnpm build          # full build (always run before pushing)
pnpm lint           # ESLint check
```

## Code Conventions
- Always use `lib/api/<domain>.ts` + `hooks/use<Domain>.ts` pattern — never inline `fetch()` in pages
- Use TanStack Query's `useQuery`/`useMutation` for all API calls
- Invalidate relevant query keys in `useMutation.onSuccess`
- Components under `components/ui/` are Shadcn-based — extend, don't replace
- Use `orgRoute(orgSlug, path)` helper for all internal links

## RBAC in UI
```typescript
const { hasPermission, hasRole } = useAppPermissions();
// Show/hide UI elements:
if (hasPermission("logistics.tasks.manage")) { ... }
if (hasRole("dispatcher")) { ... }
```

## Key Rules
- Always run `pnpm build` before pushing — CI fails on build errors
- Never call `fetch()` directly in pages — use apiClient + TanStack Query hooks
- Image tags in devops-k8s values.yaml are set by build.sh only
