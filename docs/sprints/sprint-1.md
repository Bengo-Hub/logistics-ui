# UI Sprint 1 – Foundation & SSO

**Status**: ✅ DONE
**Completed**: 2026-03-07

## Goals
- Next.js 15 App Router scaffold with [orgSlug] dynamic routing
- SSO authentication (PKCE flow via auth-api)
- TanStack Query + shared apiClient setup
- Shared UI component library (Shadcn + Tailwind)
- Role-based navigation and route guards

## Completed

### App Scaffold ✅
- Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI
- `[orgSlug]/` layout with sidebar navigation and user menu
- `AuthGuard`: redirects unauthenticated users to SSO login; 401/403 → `/unauthorized`
- PWA manifest + next-pwa config

### Auth & Identity ✅
- OIDC/PKCE login flow: redirect → auth-api → callback → token exchange
- Axios apiClient with JWT Bearer header; 401 interceptor for token refresh
- `useMe` hook: `GET /api/v1/me` from auth-api, cached 5 min (TanStack Query)
- `hasRole` / `hasPermission` helpers for RBAC-gated UI elements

### Navigation ✅
- Sidebar: Dashboard, Riders, Tasks, Tracking, Zones, Settings; visibility by role/permission
- Breadcrumb component; 404 / unauthorized pages

### Infrastructure ✅
- `lib/api/client.ts`: shared Axios instance with orgSlug-scoped base URL
- `lib/api/tenant.ts`: tenant resolution helpers
- TanStack Query provider in AuthProvider (staleTime defaults, devtools)
- K8s values.yaml created (`logistics.codevertexafrica.com`)
