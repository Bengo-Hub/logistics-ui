# logistics-ui -- Architecture

**Service**: logistics-ui (Next.js 15)
**Purpose**: Tenant admin / dispatcher dashboard for fleet ops, rider onboarding, delivery zone config, live tracking
**Canonical tenant**: `urban-loft` | **Active outlet**: Busia
**Status**: Scaffolded (Sprint 1 complete -- project setup, auth plumbing, TanStack Query, Axios client, PWA manifest)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS + Shadcn UI |
| State | Zustand (global) + TanStack Query (server) |
| API client | Axios with auth interceptors, retry, 401 redirect |
| PWA | @ducanh2912/next-pwa |
| Forms | React Hook Form + Zod |
| Maps | Leaflet / react-leaflet (delivery zones, live tracking) |
| Auth | SSO via auth-ui (OIDC/OAuth2 PKCE) |
| Real-time | WebSocket (live rider tracking, task status) |

---

## Service boundaries

### Owned by logistics-ui

- Rider onboarding (KYC document upload, vehicle registration, approval workflow)
- Fleet management (fleet CRUD, member listing, vehicle registry)
- Delivery zone configuration (zone boundary editor on map)
- Live delivery tracking (WebSocket rider locations on map)
- Task dashboard (list, filter, assign, cancel)
- Dispatcher tools (manual assignment, batch dispatch)

### Redirects elsewhere

| Feature | Target | URL |
|---------|--------|-----|
| Customer ordering | ordering-service | ordersapp.codevertexitsolutions.com |
| Staff portal (general) | cafe-website | theurbanloftcafe.com/staff |
| SSO login | auth-ui | accounts.codevertexitsolutions.com |
| Rider self-service | rider-app | riderapp.codevertexitsolutions.com |

---

## Planned route structure

```
src/app/
  (auth)/
    login/page.tsx            -- SSO redirect
    callback/page.tsx         -- OAuth callback
  (dashboard)/
    layout.tsx                -- sidebar, header, tenant context
    page.tsx                  -- overview / home
    riders/
      page.tsx                -- rider list (pending, active, suspended)
      [riderId]/page.tsx      -- rider detail + KYC review
      invite/page.tsx         -- invite new rider
    fleets/
      page.tsx                -- fleet list
      [fleetId]/page.tsx      -- fleet detail + members
      new/page.tsx            -- create fleet
    tasks/
      page.tsx                -- task list with filters
      [taskId]/page.tsx       -- task detail + tracking map
    tracking/
      page.tsx                -- live map (all active riders)
    zones/
      page.tsx                -- delivery zone list
      editor/page.tsx         -- zone boundary editor (map)
    settings/
      page.tsx                -- tenant settings
```

---

## Multi-tenancy model

| Concept | Implementation |
|---------|---------------|
| Tenant context | `NEXT_PUBLIC_TENANT_SLUG` env var (default `urban-loft`) |
| API scoping | All API calls include `{tenantSlug}` in path |
| Headers | `X-Tenant-Slug`, `X-Tenant-ID` on every request |
| SSO | Tenant claim in JWT; validated by logistics-api |

### Platform admin vs tenant admin

| Role | Access | UI scope |
|------|--------|----------|
| Platform admin | Cross-tenant rider/fleet views, zone config, system settings | Full sidebar, tenant switcher (post-MVP) |
| Tenant admin | Own tenant riders, fleets, tasks, zones | Scoped sidebar, no tenant switcher |
| Dispatcher | Task assignment, live tracking, rider status | Tasks + tracking sections only |

---

## Multi-outlet awareness

Current MVP: single outlet (Busia) under `urban-loft`. Outlet selector hidden.

Post-MVP: outlet dropdown in header filters tasks, riders, and zones by outlet. Each outlet can have its own delivery zones and dispatch rules.

---

## Auth flow

1. User visits logistics-ui
2. Middleware checks for session; if absent, redirects to auth-ui
3. Auth-ui handles login (OIDC PKCE) against auth-service
4. Callback page receives code, exchanges for tokens
5. Tokens stored in Zustand (persisted to localStorage)
6. Axios interceptor attaches `Authorization: Bearer {token}` to all API calls
7. On 401, interceptor attempts token refresh; on failure, redirects to login

---

## Real-time architecture (WebSocket)

```
logistics-api (WebSocket server)
    |
    +-- /ws/tracking/fleet       -- all active rider locations (dispatcher view)
    +-- /ws/tracking/task/{id}   -- single task tracking (detail view)
    |
logistics-ui (WebSocket client)
    |
    +-- useWebSocket() hook      -- connection management, reconnect, heartbeat
    +-- TrackingMap component    -- Leaflet map with live marker updates
```

Fallback: REST polling every 5 seconds via `GET /tracking/rider/{riderId}/location`.

---

## MVP scope (March 17, 2026)

### Must-have

- SSO login + tenant-scoped session
- Rider list with status filters (pending, active, suspended, rejected)
- Rider invite flow (email invite via admin endpoint)
- Rider KYC review (approve/reject with document viewer)
- Fleet list and detail view
- Task list with status filters and assignment
- Live tracking map (WebSocket or polling fallback)
- Responsive layout (desktop-first, tablet-compatible)

### Nice-to-have (stretch)

- Delivery zone boundary editor (Leaflet draw plugin)
- Dispatch rule configuration UI
- Rider shift scheduling
- Earnings overview per rider

### Post-MVP

- Multi-outlet selector and outlet-scoped views
- Batch dispatch tools
- Route optimization visualization
- Telemetry analytics dashboard (Superset embed)
- Vehicle compliance tracking
