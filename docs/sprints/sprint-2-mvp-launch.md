# Sprint 2 -- MVP Launch

**Timeline**: March 3 - March 17, 2026
**Goal**: Deliver a functional logistics-ui for tenant admins to manage riders, fleets, and tasks; provide live tracking; ship as part of BengoBox MVP.

**Progress (March 6, 2026):** Full Next.js app scaffold complete: SSO/PKCE, [orgSlug] routes, dashboard, riders (list + detail), tasks, tracking, zones, settings, platform admin. devops-k8s values.yaml created (logistics.codevertexitsolutions.com). **Remaining:** Wire all pages to logisticsapi; deploy.

---

## Prerequisites (from Sprint 1 -- completed)

- [x] Next.js 15 scaffold with App Router
- [x] Zustand auth store
- [x] TanStack Query provider
- [x] Axios client with 401 interceptor
- [x] PWA manifest and service worker config
- [x] Tailwind CSS + Shadcn UI setup

---

## Deliverables

### D1: Auth and shell (Days 1-2)

- [ ] OIDC login flow (redirect to auth-ui, callback handler, token exchange)
- [ ] Token refresh interceptor
- [ ] Auth middleware (redirect unauthenticated users)
- [ ] Dashboard layout (sidebar, header, breadcrumbs)
- [ ] Sidebar navigation with role-based visibility
- [ ] User menu (avatar, name, role badge, logout)
- [ ] Tenant context provider (`NEXT_PUBLIC_TENANT_SLUG=urban-loft`)

### D2: Rider management (Days 3-5)

- [ ] Rider list page with DataTable (name, code, status, fleet, vehicle, joined)
- [ ] Status filter tabs (All, Pending, Active, Suspended, Rejected)
- [ ] Search by name or driver code
- [ ] Rider detail page with profile tab
- [ ] KYC document review tab (view uploaded docs, approve/reject per doc)
- [ ] Rider invite form (email, phone, fleet dropdown, vehicle type)
- [ ] Approve/suspend/reject actions with confirmation dialogs
- [ ] Toast notifications for all mutations
- [ ] Empty states and loading skeletons

### D3: Fleet management (Days 5-6)

- [ ] Fleet list page (card grid: name, type, member count, status)
- [ ] Fleet detail page with members and vehicles tabs
- [ ] Create fleet form (name, type dropdown)
- [ ] Edit fleet (name, status)

### D4: Task management (Days 6-8)

- [ ] Task list page with DataTable
- [ ] Status filter tabs (All, Pending, Assigned, In Transit, Completed, Cancelled)
- [ ] Task detail page (split: info panel + map)
- [ ] Assign rider to task (dropdown of available riders)
- [ ] Cancel task with reason
- [ ] Status timeline stepper
- [ ] POD viewer (photo + signature preview)

### D5: Live tracking (Days 8-10)

- [ ] WebSocket connection hook (`useWebSocket`)
- [ ] Live tracking map page (full-width Leaflet, all active riders)
- [ ] Rider markers with color-coded status
- [ ] Click marker to show rider popup (name, task, speed, last update)
- [ ] Task detail map integration (pickup, dropoff, rider position)
- [ ] Polling fallback when WebSocket unavailable
- [ ] "Connection lost" banner on disconnect

### D6: Polish and deploy (Days 10-12)

- [ ] Responsive layout (desktop + tablet)
- [ ] Error boundaries and retry UI
- [ ] Loading skeletons on all pages
- [ ] 404 and error pages
- [ ] Dockerfile and build.sh
- [ ] CI/CD pipeline (GitHub Actions -> deploy)
- [ ] Environment config for production
- [ ] Smoke test all flows end-to-end

---

## API dependencies (logistics-api)

All endpoints below must be functional before sprint completion:

| Endpoint | Status |
|----------|--------|
| `GET /{t}/admin/riders` | Deployed |
| `POST /{t}/admin/riders/invite` | Deployed |
| `PUT /{t}/admin/riders/{id}/approve` | Deployed |
| `PUT /{t}/admin/riders/{id}/suspend` | Deployed |
| `PUT /{t}/admin/riders/{id}/reject` | Deployed |
| `GET/POST /{t}/fleets` | Deployed |
| `GET /{t}/fleets/{id}` | Deployed |
| `GET /{t}/tasks` | Deployed |
| `GET /{t}/tasks/{taskId}` | Deployed |
| `POST /{t}/tasks/{taskId}/assign` | Deployed |
| `POST /{t}/tasks/{taskId}/cancel` | Deployed |
| `GET /{t}/tracking/rider/{riderId}/location` | Deployed |
| `GET /{t}/tracking/task/{taskId}` | Deployed |
| `GET /{t}/deliveries/{taskId}/proof` | Deployed |
| `WebSocket /ws/tracking/fleet` | Needs implementation |

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| WebSocket endpoint not ready | Live tracking degraded | Polling fallback (5s interval) |
| KYC document upload not in API | Rider onboarding incomplete | Show placeholder "Documents pending" |
| Zone config API not ready | Stretch goal dropped | Defer to Sprint 3 |
| Auth token refresh edge cases | Users get logged out | Aggressive refresh (5 min before expiry) |

---

## Definition of done

- [ ] All D1-D5 deliverables functional
- [ ] Desktop and tablet layouts verified
- [ ] Auth flow tested end-to-end (login, refresh, logout)
- [ ] Rider CRUD flow tested (invite, approve, suspend, reject)
- [ ] Task assignment and tracking tested with live logistics-api
- [ ] Deployed to production URL
- [ ] No console errors in production build
